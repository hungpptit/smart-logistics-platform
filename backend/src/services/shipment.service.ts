import { prisma } from '../config/prisma';
import { CreateShipmentDto, UpdateShipmentStatusDto } from '../dtos/shipment.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { ShipmentStatus, ShipmentEventType } from '@prisma/client';

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
          if (pkg.order.status === 'CREATED' || pkg.order.status === 'READY_FOR_PICKUP') {
            await tx.order.update({
              where: { id: pkg.orderId },
              data: { status: 'PICKUP_ASSIGNED' },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: pkg.orderId,
                status: 'PICKUP_ASSIGNED',
                changedByUserId: creatorId,
                reason: `Đơn hàng được gom vào vận đơn ${shipmentCode} chuẩn bị lấy hàng`,
              },
            });
          }
        }
      }

      // Create ShipmentEvent logs
      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType: ShipmentEventType.CREATED,
          eventTime: new Date(),
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
          shipmentEvents: true,
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
      where.shipmentCode = { contains: query.search, mode: 'insensitive' };
    }

    const [total, shipments] = await prisma.$transaction([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          _count: {
            select: { shipmentPackages: true },
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
        shipmentEvents: {
          orderBy: { eventTime: 'desc' },
          include: {
            facility: true,
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

    // Map ShipmentStatus to ShipmentEventType for log
    let eventType: ShipmentEventType = ShipmentEventType.EXCEPTION_OCCURRED;
    switch (dto.status) {
      case ShipmentStatus.CREATED:
        eventType = ShipmentEventType.CREATED;
        break;
      case ShipmentStatus.ASSIGNED:
        eventType = ShipmentEventType.DRIVER_ASSIGNED;
        break;
      case ShipmentStatus.IN_TRANSIT:
        eventType = ShipmentEventType.DEPARTED_FACILITY;
        break;
      case ShipmentStatus.AT_HUB:
        eventType = ShipmentEventType.ARRIVED_FACILITY;
        break;
      case ShipmentStatus.OUT_FOR_DELIVERY:
        eventType = ShipmentEventType.OUT_FOR_DELIVERY;
        break;
      case ShipmentStatus.DELIVERED:
        eventType = ShipmentEventType.DELIVERY_SUCCESS;
        break;
      case ShipmentStatus.DELIVERY_FAILED:
        eventType = ShipmentEventType.DELIVERY_FAIL;
        break;
      case ShipmentStatus.RETURNING:
        eventType = ShipmentEventType.RETURN_STARTED;
        break;
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Shipment status
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          status: dto.status,
          updatedBy: userId,
        },
      });

      // 2. Create ShipmentEvent
      await tx.shipmentEvent.create({
        data: {
          shipmentId: id,
          eventType,
          facilityId: dto.facilityId || null,
          latitude: dto.latitude || null,
          longitude: dto.longitude || null,
          eventTime: new Date(),
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

      for (const sp of shipmentPackages) {
        let orderStatusUpdate: string | null = null;
        let reason = '';

        if (dto.status === ShipmentStatus.IN_TRANSIT) {
          orderStatusUpdate = 'PICKED_UP';
          reason = `Đơn hàng đã được lấy và đang trong quá trình luân chuyển qua vận đơn ${shipment.shipmentCode}`;
        } else if (dto.status === ShipmentStatus.AT_HUB) {
          orderStatusUpdate = 'ARRIVED_ORIGIN_FACILITY';
          reason = `Hàng đã cập kho trung chuyển trung tâm`;
        } else if (dto.status === ShipmentStatus.OUT_FOR_DELIVERY) {
          orderStatusUpdate = 'OUT_FOR_DELIVERY';
          reason = `Đơn hàng đang được shipper đi giao`;
        } else if (dto.status === ShipmentStatus.DELIVERED) {
          orderStatusUpdate = 'DELIVERED';
          reason = `Đơn giao hàng thành công`;
        } else if (dto.status === ShipmentStatus.DELIVERY_FAILED) {
          orderStatusUpdate = 'FAILED';
          reason = `Giao hàng thất bại: ${dto.notes || 'Không liên lạc được khách hàng'}`;
        }

        if (orderStatusUpdate) {
          await tx.order.update({
            where: { id: sp.package.orderId },
            data: { status: orderStatusUpdate as any },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: sp.package.orderId,
              status: orderStatusUpdate as any,
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
