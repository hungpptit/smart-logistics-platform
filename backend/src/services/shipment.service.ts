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
          createdAt: new Date(),
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
          orderBy: { createdAt: 'desc' },
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
  public async updateShipmentStatus(idOrCode: string, userId: string, dto: UpdateShipmentStatusDto) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const shipment = await prisma.shipment.findFirst({
      where: isUuid
        ? { id: idOrCode, status: { not: ShipmentStatus.CANCELLED } }
        : { shipmentCode: idOrCode, status: { not: ShipmentStatus.CANCELLED } },
    });

    if (!shipment) {
      throw new NotFoundException(`Không tìm thấy vận đơn gom ${idOrCode} để cập nhật`);
    }

    // Lookup TrackingEventType and Meta from Centralized Map Constants
    const eventType = SHIPMENT_TO_TRACKING_EVENT_MAP[dto.status] || ('EXCEPTION_OCCURRED' as any);
    const eventMeta = TRACKING_EVENT_CONFIG[eventType as string];
    const description = dto.notes || eventMeta?.defaultDesc || 'Cập nhật trạng thái vận đơn';

    return await prisma.$transaction(async (tx) => {
      // 1. Update Shipment status
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: dto.status,
          updatedBy: userId,
        },
      });

      // 2. Create TrackingEvent
      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType,
          description,
          latitude: dto.latitude || null,
          longitude: dto.longitude || null,
          createdAt: new Date(),
          createdBy: userId,
        },
      });

      // 3. Update all packages parent Order status based on shipment transitions
      const shipmentPackages = await tx.shipmentPackage.findMany({
        where: { shipmentId: shipment.id },
        include: {
          package: true,
        },
      });

      // 3. Update all packages parent Order status based on shipment transitions (using Centralized Sync Map)
      const orderSyncMeta = SHIPMENT_TO_ORDER_SYNC_MAP[dto.status];
      if (orderSyncMeta) {
        const reason = orderSyncMeta.getReason(shipment.shipmentCode, dto.notes);

        let targetFacilityId: string | null = null;
        const staffUser = await tx.staff.findUnique({ where: { userId } });
        if (staffUser?.assignedFacilityId) {
          targetFacilityId = staffUser.assignedFacilityId;
        } else {
          const managedFacility = await tx.facility.findFirst({ where: { managerUserId: userId } });
          if (managedFacility) {
            targetFacilityId = managedFacility.id;
          } else if (shipment.destinationFacilityId) {
            targetFacilityId = shipment.destinationFacilityId;
          } else if (shipment.originFacilityId) {
            targetFacilityId = shipment.originFacilityId;
          }
        }

        if (targetFacilityId) {
          const receivingZone = await tx.facilityZone.findFirst({
            where: {
              facilityId: targetFacilityId,
              zoneType: 'RECEIVING',
            },
          });

          let receivingToteCode: string | null = null;
          if (receivingZone) {
            const facObj = await tx.facility.findUnique({
              where: { id: targetFacilityId },
              select: { facilityCode: true },
            });
            const facCodeClean = facObj?.facilityCode?.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() || '';
            const defaultToteCode = facCodeClean
              ? `TOTE-${facCodeClean}-${receivingZone.zoneCode}-001`
              : `TOTE-${receivingZone.zoneCode}-001`;

            const activeTote = await tx.toteBag.findFirst({
              where: {
                facilityId: targetFacilityId,
                zoneCode: receivingZone.zoneCode,
                status: 'OPEN',
              },
            });

            if (activeTote) {
              receivingToteCode = activeTote.toteCode;
            } else {
              const newTote = await tx.toteBag.upsert({
                where: { toteCode: defaultToteCode },
                update: { facilityId: targetFacilityId },
                create: {
                  toteCode: defaultToteCode,
                  zoneCode: receivingZone.zoneCode,
                  facilityId: targetFacilityId,
                  status: 'OPEN',
                },
              });
              receivingToteCode = newTote.toteCode;
            }
          }

          const existingShipmentScan = await tx.warehouseScan.findFirst({
            where: {
              facilityId: targetFacilityId,
              shipmentId: shipment.id,
              packageId: null,
            },
          });

          if (!existingShipmentScan) {
            await tx.warehouseScan.create({
              data: {
                facilityId: targetFacilityId,
                shipmentId: shipment.id,
                scannedBy: userId,
              },
            });
          }

          for (const sp of shipmentPackages) {
            await tx.order.update({
              where: { id: sp.package.orderId },
              data: { status: orderSyncMeta.orderStatus },
            });

            await tx.package.update({
              where: { id: sp.package.id },
              data: {
                currentFacilityId: targetFacilityId,
                currentZoneId: receivingZone?.id || sp.package.currentZoneId,
              },
            });

            const existingPkgScan = await tx.warehouseScan.findFirst({
              where: {
                facilityId: targetFacilityId,
                packageId: sp.package.id,
              },
            });

            if (!existingPkgScan) {
              await tx.warehouseScan.create({
                data: {
                  facilityId: targetFacilityId,
                  shipmentId: shipment.id,
                  packageId: sp.package.id,
                  toteCode: receivingToteCode,
                  scannedBy: userId,
                },
              });
            }

            const existingHistory = await tx.orderStatusHistory.findFirst({
              where: {
                orderId: sp.package.orderId,
                status: orderSyncMeta.orderStatus,
                reason,
              },
            });

            if (!existingHistory) {
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
        }
      }

      return updatedShipment;
    });
  }

  public async deleteShipment(id: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      throw new NotFoundException('Không tìm thấy vận đơn để xóa');
    }

    return await prisma.shipment.delete({
      where: { id },
    });
  }

  /**
   * Driver scans Tote Bag QR Code to load Tote into Shipment and confirm transit
   */
  public async loadToteIntoShipment(driverUserId: string, toteCode: string) {
    const cleanToteCode = toteCode.trim();

    const tote = await prisma.toteBag.findUnique({
      where: { toteCode: cleanToteCode },
    });

    if (!tote) {
      throw new NotFoundException(`Không tìm thấy Sọt Hàng [${cleanToteCode}] trong CSDL`);
    }

    if (tote.status === 'LOADED') {
      throw new BadRequestException(`Sọt Hàng [${cleanToteCode}] đã được xếp lên xe tải trước đó`);
    }

    const scans = await prisma.warehouseScan.findMany({
      where: { toteCode: cleanToteCode },
      select: { packageId: true },
    });

    const packageIds = scans.map((s) => s.packageId).filter((id): id is string => id !== null);

    if (packageIds.length === 0) {
      throw new BadRequestException(`Sọt Hàng [${cleanToteCode}] hiện chưa chứa bưu kiện nào`);
    }

    const packages = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      include: { order: true },
    });

    const staff = await prisma.staff.findUnique({
      where: { userId: driverUserId },
    });

    const driverName = staff?.fullName || 'Tài xế xe tải';

    let shipment = await prisma.shipment.findFirst({
      where: {
        createdBy: driverUserId,
        status: { in: [ShipmentStatus.CREATED, ShipmentStatus.ASSIGNED] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (shipment) {
      const isDifferentFacility = tote.facilityId && shipment.originFacilityId && tote.facilityId !== shipment.originFacilityId;
      if (isDifferentFacility) {
        shipment = null; // Force creation of a NEW shipment code for new facility
      }
    }

    return await prisma.$transaction(async (tx) => {
      if (!shipment) {
        // Auto resolve destination facility from parent facility or Provincial Hub
        let targetDestFacilityId: string | null = null;
        if (tote.facilityId) {
          const originFac = await tx.facility.findUnique({
            where: { id: tote.facilityId },
            select: { parentFacilityId: true },
          });
          targetDestFacilityId = originFac?.parentFacilityId || null;
        }

        if (!targetDestFacilityId) {
          const defaultHub = await tx.facility.findFirst({
            where: {
              OR: [
                { facilityCode: { contains: 'HUB' } },
                { facilityCode: { contains: 'FAC-HUB' } },
              ],
            },
          });
          targetDestFacilityId = defaultHub?.id || null;
        }

        const count = await tx.shipment.count();
        const shipmentCode = `SHP-LH-${Date.now().toString().slice(-4)}${String(count + 1).padStart(4, '0')}`;
        shipment = await tx.shipment.create({
          data: {
            shipmentCode,
            status: ShipmentStatus.IN_TRANSIT,
            createdBy: driverUserId,
            originFacilityId: tote.facilityId || staff?.assignedFacilityId || null,
            destinationFacilityId: targetDestFacilityId,
          },
        });
      } else if (shipment.status !== ShipmentStatus.IN_TRANSIT) {
        shipment = await tx.shipment.update({
          where: { id: shipment.id },
          data: { status: ShipmentStatus.IN_TRANSIT },
        });
      }

      for (const pkgId of packageIds) {
        const existingSP = await tx.shipmentPackage.findFirst({
          where: { packageId: pkgId },
        });

        if (existingSP) {
          await tx.shipmentPackage.update({
            where: { id: existingSP.id },
            data: { shipmentId: shipment.id },
          });
        } else {
          await tx.shipmentPackage.create({
            data: {
              shipmentId: shipment.id,
              packageId: pkgId,
            },
          });
        }
      }

      await tx.toteBag.update({
        where: { id: tote.id },
        data: {
          status: 'LOADED',
        },
      });

      await tx.warehouseScan.updateMany({
        where: { toteCode: cleanToteCode },
        data: {
          shipmentId: shipment.id,
        },
      });

      for (const pkg of packages) {
        if (pkg.order) {
          await tx.order.update({
            where: { id: pkg.orderId },
            data: {
              status: OrderStatus.IN_TRANSIT,
              updatedBy: driverUserId,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: pkg.orderId,
              status: OrderStatus.IN_TRANSIT,
              changedByUserId: driverUserId,
              reason: `Đơn hàng đang trên xe tải trung chuyển đến bưu cục tiếp theo`,
            },
          });
        }
      }

      return {
        shipmentCode: shipment.shipmentCode,
        toteCode: cleanToteCode,
        status: 'IN_TRANSIT',
        packageCount: packageIds.length,
        driverName,
      };
    });
  }
}
