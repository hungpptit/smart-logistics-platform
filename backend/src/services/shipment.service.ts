import { prisma } from '../config/prisma';
import { CreateShipmentDto, UpdateShipmentStatusDto } from '../dtos/shipment.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { ShipmentStatus, TrackingEventType, OrderStatus, RouteStatus, RouteStopStatus, TransferStatus } from '@prisma/client';
import { TRACKING_EVENT_CONFIG } from '../constants/tracking.constant';
import { SHIPMENT_TO_TRACKING_EVENT_MAP, SHIPMENT_TO_ORDER_SYNC_MAP } from '../constants/status.constant';
import { getTrackingGateway } from '../gateways/tracking.gateway';

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
  public async getShipmentById(idOrCode: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const shipment = await prisma.shipment.findFirst({
      where: isUuid
        ? { id: idOrCode, status: { not: ShipmentStatus.CANCELLED } }
        : {
          OR: [
            { shipmentCode: idOrCode },
            { route: { routeCode: idOrCode } },
          ],
          status: { not: ShipmentStatus.CANCELLED },
        },
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
        ? { OR: [{ id: idOrCode }, { routeId: idOrCode }], status: { not: ShipmentStatus.CANCELLED } }
        : {
          OR: [
            { shipmentCode: idOrCode },
            { route: { routeCode: idOrCode } },
            { routeId: idOrCode },
          ],
          status: { not: ShipmentStatus.CANCELLED },
        },
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

          let receivingToteBagId: string | null = null;
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
              receivingToteBagId = activeTote.id;
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
              receivingToteBagId = newTote.id;
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

          const targetFacilityObj = await tx.facility.findUnique({
            where: { id: targetFacilityId },
            select: { facilityName: true },
          });
          const facName = targetFacilityObj?.facilityName || 'Bưu cục / Kho tổng';
          const inboundReason = `Đã nhập kho thành công tại ${facName}`;

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
                  toteBagId: receivingToteBagId,
                  scannedBy: userId,
                },
              });
            }

            await tx.orderStatusHistory.create({
              data: {
                orderId: sp.package.orderId,
                status: orderSyncMeta.orderStatus,
                changedByUserId: userId,
                reason: inboundReason,
              },
            });
          }

          // Update or create ShipmentTransfer to record handover completion at destination facility
          if (shipment.originFacilityId && shipment.originFacilityId !== targetFacilityId) {
            const existingTransfer = await tx.shipmentTransfer.findFirst({
              where: {
                shipmentId: shipment.id,
                toFacilityId: targetFacilityId,
              },
            });

            if (existingTransfer) {
              await tx.shipmentTransfer.update({
                where: { id: existingTransfer.id },
                data: {
                  status: TransferStatus.ARRIVED,
                  arrivedAt: new Date(),
                  receivedBy: userId,
                },
              });
            } else {
              await tx.shipmentTransfer.create({
                data: {
                  shipmentId: shipment.id,
                  fromFacilityId: shipment.originFacilityId,
                  toFacilityId: targetFacilityId,
                  status: TransferStatus.ARRIVED,
                  dispatchedAt: shipment.createdAt || new Date(),
                  arrivedAt: new Date(),
                  receivedBy: userId,
                },
              });
            }
          }
        }
      }

      // 3.1 Update associated Route and RouteStops in PostgreSQL DB
      if (shipment.routeId) {
        if (dto.status === 'IN_TRANSIT') {
          await tx.routeStop.updateMany({
            where: { routeId: shipment.routeId, sequence: 1 },
            data: { status: 'DEPARTED', departedAt: new Date() },
          });
          await tx.route.update({
            where: { id: shipment.routeId },
            data: { status: 'IN_PROGRESS', actualStartAt: new Date() },
          });
        } else if (dto.status === 'AT_HUB' || dto.status === 'DELIVERED') {
          await tx.routeStop.updateMany({
            where: { routeId: shipment.routeId, sequence: { gte: 2 } },
            data: { status: 'DEPARTED', arrivedAt: new Date() },
          });
          await tx.route.update({
            where: { id: shipment.routeId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        }
      }

      // 4. Dynamic Mid-Route Consolidation Check (< 80% Truck Utilization for 6-Region Network)
      let consolidatedAdded = false;
      let intermediateFacilityName = '';

      if (dto.status === 'IN_TRANSIT' && shipment.routeId && shipment.originFacilityId && shipment.destinationFacilityId) {
        const originFac = await tx.facility.findUnique({ where: { id: shipment.originFacilityId } });
        const destFac = await tx.facility.findUnique({ where: { id: shipment.destinationFacilityId } });

        if (originFac?.regionSequence && destFac?.regionSequence) {
          const seqA = originFac.regionSequence;
          const seqB = destFac.regionSequence;

          // Check if non-adjacent regions (|seqA - seqB| > 1) e.g. South -> North
          if (Math.abs(seqA - seqB) > 1) {
            const scans = await tx.warehouseScan.findMany({
              where: { shipmentId: shipment.id, toteBagId: { not: null } },
            });
            const toteIds = new Set(scans.map(s => s.toteBagId));
            const loadedTotesCount = toteIds.size;

            // Threshold: Capacity < 80% (<= 4 totes out of 8 max capacity)
            if (loadedTotesCount < 4) {
              const intermediateHubs = await tx.facility.findMany({
                where: {
                  regionSequence: {
                    gt: Math.min(seqA, seqB),
                    lt: Math.max(seqA, seqB),
                  },
                  operatingStatus: 'ACTIVE',
                },
                include: {
                  address: true,
                },
                orderBy: {
                  regionSequence: seqA < seqB ? 'asc' : 'desc',
                },
              });

              if (intermediateHubs.length > 0) {
                const targetHub = intermediateHubs[0];
                const existingStop = await tx.routeStop.findFirst({
                  where: { routeId: shipment.routeId, facilityId: targetHub.id },
                });

                if (!existingStop) {
                  await tx.routeStop.updateMany({
                    where: { routeId: shipment.routeId, sequence: { gte: 2 } },
                    data: { sequence: 3 },
                  });

                  await tx.routeStop.create({
                    data: {
                      routeId: shipment.routeId,
                      sequence: 2,
                      facilityId: targetHub.id,
                      stopType: 'PICKUP',
                      status: 'PENDING',
                      addressSnapshot: targetHub.address?.addressLine1 || targetHub.facilityName,
                      latitude: targetHub.address?.latitude || 16.0678,
                      longitude: targetHub.address?.longitude || 108.2208,
                    },
                  });

                  consolidatedAdded = true;
                  intermediateFacilityName = targetHub.facilityName;
                }
              }
            }
          }
        }
      }

      return {
        ...updatedShipment,
        consolidatedAdded,
        intermediateFacilityName,
      };
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
      where: { toteBagId: tote.id },
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

    // Find or auto-create active DriverVehicleAssignment for this driver
    let dva = staff
      ? await prisma.driverVehicleAssignment.findFirst({
        where: { driverId: staff.id, isActive: true },
      })
      : null;

    if (staff && !dva) {
      let vehicle = await prisma.vehicle.findFirst({
        where: { assignedFacilityId: tote.facilityId || undefined, operatingStatus: 'ACTIVE' },
      });
      if (!vehicle) {
        vehicle = await prisma.vehicle.findFirst({ where: { operatingStatus: 'ACTIVE' } });
      }
      if (!vehicle) {
        vehicle = await prisma.vehicle.findFirst();
      }
      if (vehicle) {
        dva = await prisma.driverVehicleAssignment.create({
          data: {
            driverId: staff.id,
            vehicleId: vehicle.id,
            assignedFrom: new Date(),
            isActive: true,
          },
        });
      }
    }

    let shipment = await prisma.shipment.findFirst({
      where: {
        createdBy: driverUserId,
        status: { in: [ShipmentStatus.CREATED, ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (shipment) {
      const isDifferentFacility = tote.facilityId && shipment.originFacilityId && tote.facilityId !== shipment.originFacilityId;
      if (isDifferentFacility) {
        shipment = null; // Force creation of a NEW shipment code for new facility
      }
    }

    const result = await prisma.$transaction(async (tx) => {
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

      // Create or update assigned Route for Linehaul Transfer Driver
      const originFacId = tote.facilityId || staff?.assignedFacilityId || shipment.originFacilityId;
      const destFacId = shipment.destinationFacilityId;

      let route = shipment.routeId
        ? await tx.route.findUnique({ where: { id: shipment.routeId } })
        : null;

      if (!route) {
        const routeCode = `RT-LH-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        route = await tx.route.create({
          data: {
            routeCode,
            driverVehicleAssignmentId: dva?.id || null,
            startFacilityId: originFacId || staff?.assignedFacilityId!,
            endFacilityId: destFacId || null,
            status: RouteStatus.IN_PROGRESS,
            actualStartAt: new Date(),
            plannedDistanceKm: 12.5,
            plannedDurationMin: 30,
            totalStops: 2,
          },
        });

        await tx.shipment.update({
          where: { id: shipment.id },
          data: { routeId: route.id },
        });
      } else if (dva && route.driverVehicleAssignmentId !== dva.id) {
        await tx.route.update({
          where: { id: route.id },
          data: {
            driverVehicleAssignmentId: dva.id,
            status: RouteStatus.IN_PROGRESS,
            actualStartAt: route.actualStartAt || new Date(),
          },
        });
      }

      // Ensure RouteStops exist for the Linehaul Route
      const existingStopsCount = await tx.routeStop.count({
        where: { routeId: route.id },
      });

      if (existingStopsCount === 0 && originFacId) {
        const originFac = await tx.facility.findUnique({
          where: { id: originFacId },
          include: { address: true },
        });
        const destFac = destFacId
          ? await tx.facility.findUnique({
            where: { id: destFacId },
            include: { address: true },
          })
          : null;

        await tx.routeStop.create({
          data: {
            routeId: route.id,
            shipmentId: shipment.id,
            facilityId: originFac?.id || null,
            stopType: 'PICKUP',
            sequence: 1,
            addressSnapshot: originFac
              ? `${originFac.facilityName} - ${originFac.address?.addressLine1 || ''}`
              : 'Bưu cục xuất kho trung chuyển',
            latitude: originFac?.address?.latitude ? Number(originFac.address.latitude) : 10.8500,
            longitude: originFac?.address?.longitude ? Number(originFac.address.longitude) : 106.7700,
            status: RouteStopStatus.PENDING,
            arrivedAt: new Date(),
            departedAt: null,
          },
        });

        await tx.routeStop.create({
          data: {
            routeId: route.id,
            shipmentId: shipment.id,
            facilityId: destFac?.id || null,
            stopType: 'DELIVERY',
            sequence: 2,
            addressSnapshot: destFac
              ? `${destFac.facilityName} - ${destFac.address?.addressLine1 || ''}`
              : 'Bưu cục / Hub nhận hàng trung chuyển',
            latitude: destFac?.address?.latitude ? Number(destFac.address.latitude) : 10.8700,
            longitude: destFac?.address?.longitude ? Number(destFac.address.longitude) : 106.8000,
            status: RouteStopStatus.PENDING,
          },
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
        where: { toteBagId: tote.id },
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

      // Ensure ShipmentTransfer is recorded for inter-facility transfers
      if (shipment.originFacilityId && shipment.destinationFacilityId && shipment.originFacilityId !== shipment.destinationFacilityId) {
        const existingTransfer = await tx.shipmentTransfer.findFirst({
          where: {
            shipmentId: shipment.id,
            fromFacilityId: shipment.originFacilityId,
            toFacilityId: shipment.destinationFacilityId,
          },
        });

        if (!existingTransfer) {
          await tx.shipmentTransfer.create({
            data: {
              shipmentId: shipment.id,
              fromFacilityId: shipment.originFacilityId,
              toFacilityId: shipment.destinationFacilityId,
              status: TransferStatus.IN_TRANSIT,
              dispatchedAt: new Date(),
            },
          });
        }
      }

      // Calculate total loaded totes and packages for this shipment
      const allScans = await tx.warehouseScan.findMany({
        where: { shipmentId: shipment.id, toteBagId: { not: null } },
        include: { toteBag: true },
      });

      const toteMap = new Map<string, string>();
      for (const s of allScans) {
        if (s.toteBag) {
          toteMap.set(s.toteBag.id, s.toteBag.toteCode);
        }
      }
      const loadedTotes = Array.from(toteMap.values());

      const totalPackageCount = await tx.shipmentPackage.count({
        where: { shipmentId: shipment.id },
      });

      return {
        shipmentCode: shipment.shipmentCode,
        routeCode: route.routeCode,
        routeId: route.id,
        toteCode: cleanToteCode,
        status: 'IN_TRANSIT',
        packageCount: packageIds.length,
        totalPackageCount,
        loadedTotesCount: loadedTotes.length,
        loadedTotes,
        driverName,
      };
    });

    try {
      getTrackingGateway()?.broadcastRoutesUpdated();
    } catch (_) { }

    return result;
  }
}
