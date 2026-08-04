import { prisma } from '../config/prisma';
import { CreateShipmentDto, UpdateShipmentStatusDto } from '../dtos/shipment.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { ShipmentStatus, TrackingEventType, OrderStatus } from '@prisma/client';
import { TRACKING_EVENT_CONFIG } from '../constants/tracking.constant';
import { SHIPMENT_TO_TRACKING_EVENT_MAP, SHIPMENT_TO_ORDER_SYNC_MAP } from '../constants/status.constant';

export class ShipmentService {
  /**
   * Create a new shipment and group packages into it
   */
  public async createShipment(creatorId: string, dto: CreateShipmentDto) {
    if (!dto.packageIds || dto.packageIds.length === 0) {
      throw new BadRequestException('Danh sách kiện hàng không được rỗng');
    }

    // 1. Verify all packages exist
    const packages = await prisma.package.findMany({
      where: {
        id: { in: dto.packageIds },
      },
      include: {
        order: true,
      },
    });

    if (packages.length !== dto.packageIds.length) {
      throw new BadRequestException('Một hoặc nhiều ID kiện hàng không tồn tại trên hệ thống');
    }

    // 2. Check if any package is already in an active shipment
    const activeShipmentPackages = await prisma.shipmentPackage.findFirst({
      where: {
        packageId: { in: dto.packageIds },
        shipment: {
          status: {
            in: [ShipmentStatus.CREATED, ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.AT_HUB, ShipmentStatus.OUT_FOR_DELIVERY],
          },
        },
      },
      include: {
        shipment: true,
      },
    });

    if (activeShipmentPackages) {
      throw new BadRequestException(
        `Kiện hàng đã được gom vào vận đơn đang hoạt động: ${activeShipmentPackages.shipment.shipmentCode}`
      );
    }

    // 3. Generate unique shipmentCode
    const count = await prisma.shipment.count();
    const shipmentCode = `SHP-${Date.now().toString().slice(-4)}${String(count + 1).padStart(6, '0')}`;

    // 4. Create Shipment in Transaction
    return await prisma.$transaction(async (tx) => {
      // Create Shipment record
      const shipment = await tx.shipment.create({
        data: {
          shipmentCode,
          status: dto.status || ShipmentStatus.CREATED,
          routeId: dto.routeId || null,
          createdBy: creatorId,
        },
      });

      // Create ShipmentPackage mapping
      for (const pkgId of dto.packageIds) {
        await tx.shipmentPackage.create({
          data: {
            shipmentId: shipment.id,
            packageId: pkgId,
          },
        });

        // Optional: Update parent Order status to indicate it is being shipped
        const pkg = packages.find((p) => p.id === pkgId);
        if (pkg && pkg.order) {
          // If order is currently CREATED/READY_FOR_PICKUP, update to PICKUP_ASSIGNED
          if (pkg.order.status === OrderStatus.CREATED || pkg.order.status === OrderStatus.READY_FOR_PICKUP) {
            await tx.order.update({
              where: { id: pkg.orderId },
              data: { status: OrderStatus.PICKUP_ASSIGNED },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: pkg.orderId,
                status: OrderStatus.PICKUP_ASSIGNED,
                changedByUserId: creatorId,
                reason: `Đơn hàng được gom vào vận đơn ${shipmentCode} chuẩn bị lấy hàng`,
              },
            });
          }
        }
      }

      // Create TrackingEvent logs using Centralized Config
      const eventMeta = TRACKING_EVENT_CONFIG['CREATED'];
      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType: 'CREATED' as any,
          description: eventMeta?.defaultDesc || 'Vận đơn mới đã được khởi tạo thành công',
          occurredAt: new Date(),
          createdBy: creatorId,
        },
      });

      return await tx.shipment.findUnique({
        where: { id: shipment.id },
        include: {
          shipmentPackages: {
            include: {
              package: {
                include: {
                  order: true,
                },
              },
            },
          },
          trackingEvents: true,
        },
      });
    });
  }

  /**
   * Get all shipments with filters
   */
  public async getShipments(query: {
    page?: string;
    limit?: string;
    status?: ShipmentStatus;
    search?: string;
  }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = { status: { not: ShipmentStatus.CANCELLED } };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { shipmentCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, shipments] = await prisma.$transaction([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          route: true,
          shipmentPackages: {
            include: {
              package: true,
            },
          },
        },
      }),
    ]);

    return {
      shipments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get shipment by ID
   */
  public async getShipmentById(id: string) {
    const shipment = await prisma.shipment.findFirst({
      where: { id, status: { not: ShipmentStatus.CANCELLED } },
      include: {
        route: {
          include: {
            driverVehicleAssignment: {
              include: {
                driver: true,
                vehicle: true,
              },
            },
          },
        },
        shipmentPackages: {
          include: {
            package: {
              include: {
                order: true,
              },
            },
          },
        },
        trackingEvents: {
          orderBy: { occurredAt: 'desc' },
          include: {
            creator: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('Không tìm thấy vận đơn');
    }

    return shipment;
  }

  /**
   * Update shipment status and log events
   */
  public async updateShipmentStatus(id: string, userId: string, dto: UpdateShipmentStatusDto) {
    const shipment = await prisma.shipment.findFirst({
      where: { id, status: { not: ShipmentStatus.CANCELLED } },
    });

    if (!shipment) {
      throw new NotFoundException('Không tìm thấy vận đơn để cập nhật');
    }

    // Lookup TrackingEventType and Meta from Centralized Map Constants
    const eventType = SHIPMENT_TO_TRACKING_EVENT_MAP[dto.status] || ('EXCEPTION_OCCURRED' as any);
    const eventMeta = TRACKING_EVENT_CONFIG[eventType as string];
    const description = dto.notes || eventMeta?.defaultDesc || 'Cập nhật trạng thái vận đơn';

    return await prisma.$transaction(async (tx) => {
      // 1. Update Shipment status
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          status: dto.status,
          updatedBy: userId,
        },
      });

      // 2. Create TrackingEvent
      await tx.trackingEvent.create({
        data: {
          shipmentId: id,
          eventType,
          description,
          latitude: dto.latitude || null,
          longitude: dto.longitude || null,
          occurredAt: new Date(),
          createdBy: userId,
        },
      });

      // 3. Update all packages parent Order status based on shipment transitions
      const shipmentPackages = await tx.shipmentPackage.findMany({
        where: { shipmentId: id },
        include: {
          package: true,
        },
      });

      // 3. Update all packages parent Order status based on shipment transitions (using Centralized Sync Map)
      const orderSyncMeta = SHIPMENT_TO_ORDER_SYNC_MAP[dto.status];
      if (orderSyncMeta) {
        const reason = orderSyncMeta.getReason(shipment.shipmentCode, dto.notes);
        for (const sp of shipmentPackages) {
          await tx.order.update({
            where: { id: sp.package.orderId },
            data: { status: orderSyncMeta.orderStatus },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: sp.package.orderId,
              status: orderSyncMeta.orderStatus,
              changedByUserId: userId,
              reason,
            },
          });
        }
      }

      return updatedShipment;
    });
  }

  /**
   * Delete / Soft delete shipment
   */
  public async deleteShipment(id: string) {
    const shipment = await prisma.shipment.findFirst({
      where: { id, status: { not: ShipmentStatus.CANCELLED } },
    });

    if (!shipment) {
      throw new NotFoundException('Không tìm thấy vận đơn để xóa');
    }

    if (shipment.status !== ShipmentStatus.CREATED) {
      throw new BadRequestException('Chỉ có thể xóa vận đơn ở trạng thái MỚI TẠO (CREATED)');
    }

    await prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.CANCELLED,
      },
    });

    return { success: true };
  }
}
