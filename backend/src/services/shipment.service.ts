import { prisma } from '../config/prisma';
import { CreateShipmentDto, UpdateShipmentStatusDto } from '../dtos/shipment.dto';
import { BadRequestException, NotFoundException, ForbiddenException } from '../middlewares/error.middleware';
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
            { warehouseScans: { some: { toteBag: { toteCode: idOrCode } } } },
            { shipmentPackages: { some: { package: { order: { orderCode: idOrCode } } } } },
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

    const result = await prisma.$transaction(async (tx) => {
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
          const targetFacilityObj = await tx.facility.findUnique({
            where: { id: targetFacilityId },
            select: { facilityName: true },
          });
          const facName = targetFacilityObj?.facilityName || 'Bưu cục / Kho tổng';

          if (dto.status === 'IN_TRANSIT') {
            // 🚚 NGHIỆP VỤ XUẤT KHO TRUNG CHUYỂN (GATE OUT):
            // Hàng hóa rời kho lên xe tải -> currentFacilityId = null, lý do xuất kho
            const outReason = `Đã xuất kho trung chuyển từ ${facName} (Chuyến xe ${shipment.shipmentCode})`;

            for (const sp of shipmentPackages) {
              await tx.order.update({
                where: { id: sp.package.orderId },
                data: { status: orderSyncMeta.orderStatus },
              });

              await tx.package.update({
                where: { id: sp.package.id },
                data: {
                  currentFacilityId: null,
                  currentZoneId: null,
                },
              });

              await tx.orderStatusHistory.create({
                data: {
                  orderId: sp.package.orderId,
                  status: orderSyncMeta.orderStatus,
                  changedByUserId: userId,
                  reason: outReason,
                },
              });
            }
          } else {
            // 🏢 NGHIỆP VỤ NHẬP KHO TIẾP NHẬN (GATE IN / AT_HUB):
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
          // Khi Nhân viên Kho Web quét xuất bến (IN_TRANSIT):
          // Hoàn thành RouteStop điểm xuất phát (sequence: 1) sang DEPARTED
          await tx.routeStop.updateMany({
            where: { routeId: shipment.routeId, sequence: 1 },
            data: { status: 'DEPARTED', departedAt: new Date() },
          });
          await tx.route.update({
            where: { id: shipment.routeId },
            data: { status: 'IN_PROGRESS', actualStartAt: new Date() },
          });

          // Update ShipmentTransfer to IN_TRANSIT with dispatchedAt
          const existingTransfer = await tx.shipmentTransfer.findFirst({
            where: { shipmentId: shipment.id },
          });
          if (existingTransfer) {
            await tx.shipmentTransfer.update({
              where: { id: existingTransfer.id },
              data: {
                status: TransferStatus.IN_TRANSIT,
                dispatchedAt: new Date(),
              },
            });
          } else if (shipment.originFacilityId && shipment.destinationFacilityId) {
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
        } else if (dto.status === 'AT_HUB' || dto.status === 'DELIVERED') {
          // Khi Nhân viên Kho Đích Web quét nhập bến (AT_HUB):
          // Hoàn thành RouteStop điểm đích (sequence >= 2) sang DEPARTED
          await tx.routeStop.updateMany({
            where: { routeId: shipment.routeId, sequence: { gte: 2 } },
            data: { status: 'DEPARTED', arrivedAt: new Date() },
          });
          // Lưu ý: Tuyến đường (Route) vẫn giữ ở trạng thái IN_PROGRESS để Tài xế sau khi dỡ hàng xong
          // sẽ tự tay bấm nút "CHỐT HOÀN THÀNH CHUYẾN ĐI" trên App Mobile.
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

    try {
      const trackingGateway = getTrackingGateway();
      if (trackingGateway) {
        trackingGateway.broadcastRoutesUpdated();
      }
    } catch (e) {
      console.warn('[ShipmentService] Socket broadcast error:', e);
    }

    return result;
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
      include: {
        order: {
          include: {
            destinationFacility: { include: { address: true } },
            originFacility: { include: { address: true } },
            pickupAddress: {
              include: {
                wardRelation: {
                  include: {
                    province: true,
                  },
                },
              },
            },
            deliveryAddress: {
              include: {
                wardRelation: {
                  include: {
                    province: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const staff = await prisma.staff.findUnique({
      where: { userId: driverUserId },
      include: { driverTypes: true },
    });

    if (staff) {
      const driverTypesList = staff.driverTypes?.map((dt) => dt.driverType) || [];
      const isLinehaul = driverTypesList.includes('LINEHAUL_TRANSFER' as any) &&
        staff.driverLicenseClass !== 'A1' &&
        staff.driverLicenseClass !== 'A2';
      if (!isLinehaul) {
        throw new ForbiddenException('Chỉ Tài xế trung chuyển (Linehaul) mới có quyền quét nạp sọt hàng lên xe tải');
      }
    }

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

    // =========================================================================
    // THUẬT TOÁN PHÂN GIẢI ĐIỂM ĐẾN TRUNG CHUYỂN LINH HOẠT THEO 4 KỊCH BẢN (3-2-1-1-2-3)
    // Pipeline tự động tính chuỗi kho [Cấp 3 -> Cấp 2 -> Cấp 1 -> Cấp 1 -> Cấp 2 -> Cấp 3]
    // =========================================================================
    let targetDestFacilityId: string | null = null;

    const originFacIdForRouting = tote.facilityId || staff?.assignedFacilityId;
    const originFac = originFacIdForRouting
      ? await prisma.facility.findUnique({
          where: { id: originFacIdForRouting },
          include: { facilityType: true, address: true, parentFacility: true },
        })
      : null;

    const samplePkg = packages[0];
    const sampleOrder = samplePkg?.order;

    if (sampleOrder && originFac) {
      // 1. Phân tích địa chỉ Người Gửi và Người Nhận
      const senderWardCode = sampleOrder.pickupAddress?.wardCode || sampleOrder.originFacility?.address?.wardCode;
      const receiverWardCode = sampleOrder.deliveryAddress?.wardCode || sampleOrder.destinationFacility?.address?.wardCode;

      const senderWard = senderWardCode
        ? await prisma.ward.findUnique({ where: { code: senderWardCode }, include: { province: { include: { administrativeRegion: true } } } })
        : null;

      const receiverWard = receiverWardCode
        ? await prisma.ward.findUnique({ where: { code: receiverWardCode }, include: { province: { include: { administrativeRegion: true } } } })
        : null;

      const senderProvCode = senderWard?.provinceCode || sampleOrder.originFacility?.provinceCode;
      const receiverProvCode = receiverWard?.provinceCode || sampleOrder.destinationFacility?.provinceCode;

      // 2. Tìm các cơ sở kho trên từng nấc thang phân cấp:
      // Cấp 3 gửi (Bưu cục gửi):
      const wsOrigin = sampleOrder.originFacilityId
        ? await prisma.facility.findUnique({ where: { id: sampleOrder.originFacilityId }, include: { facilityType: true } })
        : (senderWardCode ? await prisma.facility.findFirst({ where: { address: { wardCode: senderWardCode } }, include: { facilityType: true } }) : null);

      // Cấp 3 nhận (Bưu cục nhận):
      const wsDest = sampleOrder.destinationFacilityId
        ? await prisma.facility.findUnique({ where: { id: sampleOrder.destinationFacilityId }, include: { facilityType: true } })
        : (receiverWardCode ? await prisma.facility.findFirst({ where: { address: { wardCode: receiverWardCode } }, include: { facilityType: true } }) : null);

      // Cấp 2 gửi (Kho Tổng Tỉnh gửi):
      const hubOrigin = wsOrigin?.parentFacilityId
        ? await prisma.facility.findUnique({ where: { id: wsOrigin.parentFacilityId }, include: { facilityType: true } })
        : (senderProvCode ? await prisma.facility.findFirst({ where: { provinceCode: senderProvCode, facilityType: { typeCode: 'PROVINCIAL_HUB' }, operatingStatus: 'ACTIVE' }, include: { facilityType: true } }) : null);

      // Cấp 2 nhận (Kho Tổng Tỉnh nhận):
      const hubDest = wsDest?.parentFacilityId
        ? await prisma.facility.findUnique({ where: { id: wsDest.parentFacilityId }, include: { facilityType: true } })
        : (receiverProvCode ? await prisma.facility.findFirst({ where: { provinceCode: receiverProvCode, facilityType: { typeCode: 'PROVINCIAL_HUB' }, operatingStatus: 'ACTIVE' }, include: { facilityType: true } }) : null);

      // Cấp 1 gửi (Tổng Kho Miền gửi):
      const scOrigin = hubOrigin?.parentFacilityId
        ? await prisma.facility.findUnique({ where: { id: hubOrigin.parentFacilityId }, include: { facilityType: true } })
        : (senderProvCode ? await prisma.facility.findFirst({ where: { provinceCode: senderProvCode, facilityType: { typeCode: 'SORTING_CENTER' }, operatingStatus: 'ACTIVE' }, include: { facilityType: true } }) : null);

      // Cấp 1 nhận (Tổng Kho Miền nhận):
      const scDest = hubDest?.parentFacilityId
        ? await prisma.facility.findUnique({ where: { id: hubDest.parentFacilityId }, include: { facilityType: true } })
        : (receiverProvCode ? await prisma.facility.findFirst({ where: { provinceCode: receiverProvCode, facilityType: { typeCode: 'SORTING_CENTER' }, operatingStatus: 'ACTIVE' }, include: { facilityType: true } }) : null);

      // 3. Xây dựng Chuỗi Trạm Dừng (Pipeline) linh hoạt theo đúng 4 Kịch Bản:
      const senderRegionId = senderWard?.province?.administrativeRegionId || sampleOrder.pickupAddress?.wardRelation?.province?.administrativeRegionId;
      const receiverRegionId = receiverWard?.province?.administrativeRegionId || sampleOrder.deliveryAddress?.wardRelation?.province?.administrativeRegionId;

      const isSameRegion = (senderRegionId && receiverRegionId && senderRegionId === receiverRegionId) ||
                           (scOrigin && scDest && scOrigin.id === scDest.id);

      let pipeline: (any | null)[] = [];

      // CASE 1: Cùng Phường/Xã (3 - 3) -> Giao nội bộ bưu cục
      if (senderWardCode && receiverWardCode && senderWardCode === receiverWardCode) {
        pipeline = [wsOrigin || wsDest];
      }
      // CASE 2: Khác Phường/Xã cùng Tỉnh/TP (3 - 2 - 3) -> Qua Kho Tổng Tỉnh
      else if (senderProvCode && receiverProvCode && senderProvCode === receiverProvCode) {
        pipeline = [wsOrigin, hubOrigin || hubDest, wsDest];
      }
      // CASE 3: Khác Tỉnh/TP cùng Miền (3 - 2 - 1 - 2 - 3) -> Qua 1 Tổng Kho Miền
      else if (isSameRegion) {
        pipeline = [wsOrigin, hubOrigin, scOrigin || scDest, hubDest, wsDest];
      }
      // CASE 4: Khác Miền (3 - 2 - 1 - 1 - 2 - 3) -> Qua 2 Tổng Kho Miền (Trục Bắc - Nam)
      else {
        pipeline = [wsOrigin, hubOrigin, scOrigin, scDest, hubDest, wsDest];
      }

      // Lọc bỏ null và các trạm trùng lặp liên tiếp trong pipeline
      const validPipeline: any[] = [];
      for (const node of pipeline) {
        if (node && (!validPipeline.length || validPipeline[validPipeline.length - 1].id !== node.id)) {
          validPipeline.push(node);
        }
      }

      // 4. Tìm vị trí của Kho hiện tại (originFac) trong Pipeline để xác định trạm tiếp theo:
      let currentIdx = validPipeline.findIndex((node) => node.id === originFac.id);

      // Nếu không tìm thấy chính xác theo ID (ví dụ kho hiện tại là FAC-SC-NORTH nhưng pipeline ghi nhận FAC-SC-REGION2):
      // So khớp theo cấp độ kho (facilityType) và provinceCode
      if (currentIdx === -1) {
        const originType = originFac.facilityType?.typeCode;
        if (originType === 'WARD_STATION') {
          currentIdx = 0;
        } else if (originType === 'PROVINCIAL_HUB') {
          currentIdx = (senderProvCode === originFac.provinceCode) ? 1 : (validPipeline.length - 2);
        } else if (originType === 'SORTING_CENTER') {
          // Nếu ở miền nhận -> trạm Cấp 1 nhận
          currentIdx = (receiverProvCode === originFac.provinceCode || originFac.facilityCode?.includes('NORTH')) ? (validPipeline.length - 3) : 2;
        }
      }

      if (currentIdx !== -1 && currentIdx < validPipeline.length - 1) {
        targetDestFacilityId = validPipeline[currentIdx + 1].id;
      } else if (currentIdx === validPipeline.length - 1) {
        targetDestFacilityId = validPipeline[currentIdx].id;
      }
    }

    // Fallback: Nếu vẫn chưa có targetDestFacilityId
    if (!targetDestFacilityId && originFac?.parentFacilityId) {
      targetDestFacilityId = originFac.parentFacilityId;
    }

    if (!targetDestFacilityId && originFacIdForRouting) {
      const otherFacs = await prisma.facility.findMany({
        where: {
          id: { not: originFacIdForRouting },
          operatingStatus: 'ACTIVE',
          addressId: { not: null },
        },
        include: { address: true },
      });

      if (originFac?.address?.latitude && originFac?.address?.longitude) {
        let minDistance = Infinity;
        let closestFacId: string | null = null;
        const oLat = Number(originFac.address.latitude);
        const oLng = Number(originFac.address.longitude);

        for (const f of otherFacs) {
          if (f.address?.latitude && f.address?.longitude) {
            const fLat = Number(f.address.latitude);
            const fLng = Number(f.address.longitude);
            const dist = (fLat - oLat) * (fLat - oLat) + (fLng - oLng) * (fLng - oLng);
            if (dist < minDistance) {
              minDistance = dist;
              closestFacId = f.id;
            }
          }
        }
        targetDestFacilityId = closestFacId;
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
        const count = await tx.shipment.count();
        const shipmentCode = `SHP-LH-${Date.now().toString().slice(-4)}${String(count + 1).padStart(4, '0')}`;
        shipment = await tx.shipment.create({
          data: {
            shipmentCode,
            status: ShipmentStatus.ASSIGNED,
            createdBy: driverUserId,
            originFacilityId: tote.facilityId || staff?.assignedFacilityId || null,
            destinationFacilityId: targetDestFacilityId,
          },
        });
      } else {
        const updateData: any = {};
        if (shipment.status === ShipmentStatus.CREATED) {
          updateData.status = ShipmentStatus.ASSIGNED;
        }
        if (targetDestFacilityId && shipment.destinationFacilityId !== targetDestFacilityId) {
          updateData.destinationFacilityId = targetDestFacilityId;
        }
        if (Object.keys(updateData).length > 0) {
          shipment = await tx.shipment.update({
            where: { id: shipment.id },
            data: updateData,
          });
        }
      }

      // Create or update assigned Route for Linehaul Transfer Driver
      const originFacId = tote.facilityId || staff?.assignedFacilityId || shipment.originFacilityId;
      const destFacId = targetDestFacilityId || shipment.destinationFacilityId;

      const originFac = originFacId
        ? await tx.facility.findUnique({ where: { id: originFacId }, include: { address: true } })
        : null;
      const destFac = destFacId
        ? await tx.facility.findUnique({ where: { id: destFacId }, include: { address: true } })
        : null;

      // Calculate planned distance and duration using coordinates
      let plannedDistanceKm = 15.0;
      let plannedDurationMin = 35;
      if (originFac?.address?.latitude && originFac?.address?.longitude && destFac?.address?.latitude && destFac?.address?.longitude) {
        const lat1 = Number(originFac.address.latitude);
        const lon1 = Number(originFac.address.longitude);
        const lat2 = Number(destFac.address.latitude);
        const lon2 = Number(destFac.address.longitude);
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const airDistance = R * c;
        plannedDistanceKm = Math.round(airDistance * 1.3 * 10) / 10;
        plannedDurationMin = Math.max(20, Math.round(plannedDistanceKm / 60 * 60) + 20);
      }

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
            status: RouteStatus.ASSIGNED,
            actualStartAt: null,
            plannedDistanceKm,
            plannedDurationMin,
            totalStops: 2,
          },
        });

        await tx.shipment.update({
          where: { id: shipment.id },
          data: { routeId: route.id },
        });
      } else {
        await tx.route.update({
          where: { id: route.id },
          data: {
            driverVehicleAssignmentId: dva?.id || route.driverVehicleAssignmentId,
            endFacilityId: destFacId || route.endFacilityId,
            plannedDistanceKm,
            plannedDurationMin,
          },
        });
      }

      // Ensure RouteStops exist and point to the correct Destination Facility
      const existingStops = await tx.routeStop.findMany({
        where: { routeId: route.id },
        orderBy: { sequence: 'asc' },
      });

      if (existingStops.length === 0) {
        if (originFac) {
          await tx.routeStop.create({
            data: {
              routeId: route.id,
              shipmentId: shipment.id,
              facilityId: originFac.id,
              stopType: 'PICKUP',
              sequence: 1,
              addressSnapshot: originFac
                ? `${originFac.facilityName} - ${originFac.address?.addressLine1 || ''}`
                : 'Bưu cục xuất kho trung chuyển',
              latitude: originFac.address?.latitude ? Number(originFac.address.latitude) : 10.8500,
              longitude: originFac.address?.longitude ? Number(originFac.address.longitude) : 106.6300,
              status: RouteStopStatus.PENDING,
              arrivedAt: new Date(),
              departedAt: null,
            },
          });
        }

        if (destFac) {
          await tx.routeStop.create({
            data: {
              routeId: route.id,
              shipmentId: shipment.id,
              facilityId: destFac.id,
              stopType: 'DELIVERY',
              sequence: 2,
              addressSnapshot: destFac
                ? `${destFac.facilityName} - ${destFac.address?.addressLine1 || ''}`
                : 'Bưu cục / Hub nhận hàng trung chuyển',
              latitude: destFac.address?.latitude ? Number(destFac.address.latitude) : 11.3520,
              longitude: destFac.address?.longitude ? Number(destFac.address.longitude) : 106.1820,
              status: RouteStopStatus.PENDING,
            },
          });
        }
      } else {
        // Update destination stop sequence 2 if destFac changed
        const stop2 = existingStops.find((s) => s.sequence === 2);
        if (stop2 && destFac && stop2.facilityId !== destFac.id) {
          await tx.routeStop.update({
            where: { id: stop2.id },
            data: {
              facilityId: destFac.id,
              addressSnapshot: `${destFac.facilityName} - ${destFac.address?.addressLine1 || ''}`,
              latitude: destFac.address?.latitude ? Number(destFac.address.latitude) : 21.0285,
              longitude: destFac.address?.longitude ? Number(destFac.address.longitude) : 105.8542,
            },
          });
        }
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

      // LƯU Ý: Khi tài xế bốc thùng hàng lên xe (LOADED), các đơn hàng VẪN GIỮ TRẠNG THÁI TẠI KHO (AT_HUB)
      // Tuyệt đối KHÔNG tự chuyển sang IN_TRANSIT ở bước này.
      // Chỉ khi Nhân viên Kho Web quét xuất kho (Gate Out / IN_TRANSIT) thì đơn hàng mới chuyển sang IN_TRANSIT.

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
              status: TransferStatus.PENDING,
              dispatchedAt: null,
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
