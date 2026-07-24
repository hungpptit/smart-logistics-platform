import { prisma } from '../../config/prisma';
import { KMeansService } from './kmeans.service';
import { AssignmentService } from './assignment.service';
import { VRPService } from './vrp.service';
import { BadRequestException, NotFoundException } from '../../middlewares/error.middleware';

export class RoutingService {
  private kmeansService = new KMeansService();
  private assignmentService = new AssignmentService();
  private vrpService = new VRPService();

  /**
   * Triggers the AI routing optimization pipeline for a facility.
   */
  public async optimizeRoutesForFacility(facilityId: string, creatorId: string) {
    // 1. Fetch the facility and its primary address
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId, deletedAt: null },
      include: {
        facilityAddresses: {
          include: {
            address: true,
          },
        },
      },
    });

    if (!facility) {
      throw new NotFoundException('Không tìm thấy thông tin kho bãi');
    }

    const primaryAddress =
      facility.facilityAddresses.find((fa) => fa.isPrimary)?.address ||
      facility.facilityAddresses[0]?.address;

    if (!primaryAddress) {
      throw new BadRequestException('Kho bãi chưa có cấu hình địa chỉ/tọa độ');
    }

    const facilityLocation = {
      lat: primaryAddress.latitude,
      lng: primaryAddress.longitude,
    };

    // 2. Fetch all orders ready for AI routing at this facility (Pickup or Delivery)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { originFacilityId: facilityId, status: 'READY_FOR_PICKUP' },
          { destinationFacilityId: facilityId, status: 'AT_HUB' },
        ],
        deletedAt: null,
      },
    });

    if (orders.length === 0) {
      throw new BadRequestException('Không có đơn hàng nào ở trạng thái "Chờ lấy hàng" (READY_FOR_PICKUP) hoặc "Đã đến kho nhận" (AT_HUB) tại bưu cục này');
    }

    // 3. Fetch all active drivers assigned to this facility
    const drivers = await prisma.driver.findMany({
      where: {
        homeFacilityId: facilityId,
        employmentStatus: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        location: true,
        assignments: {
          where: { isActive: true },
          include: {
            vehicle: true,
          },
        },
      },
    });

    // Filter drivers that have active vehicle assignments
    const availableDrivers = drivers.filter(
      (driver) => driver.assignments.some((a) => a.isActive)
    );

    if (availableDrivers.length === 0) {
      throw new BadRequestException('Không có tài xế nào đang hoạt động và có gán phương tiện tại kho này');
    }

    // 4. Delegate AI K-Means & VRP Genetic Algorithm to Standalone AI Microservice (Port 5001)
    const K = Math.min(availableDrivers.length, orders.length);
    let clusters: any[] = [];

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
    try {
      const aiResponse = await fetch(`${aiServiceUrl}/api/v1/ai/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders,
          facilityLocation,
          k: K,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json() as any;
        if (aiData.success && aiData.data?.clusters) {
          clusters = aiData.data.clusters;
          console.log(`🤖 [Main Backend] Successfully delegated AI optimization to Standalone AI Microservice (${aiServiceUrl})`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ [Main Backend] Standalone AI Microservice unreachable, using local fallback:`, (err as Error).message);
    }

    // Fallback if AI Microservice is not running
    if (clusters.length === 0) {
      const rawClusters = this.kmeansService.clusterOrders(orders, K);
      clusters = await Promise.all(
        rawClusters.map(async (c) => ({
          ...c,
          orders: await this.vrpService.optimizeRouteStops(c.orders, facilityLocation),
        }))
      );
    }

    // 5. Assign drivers to clusters using Hungarian Algorithm
    const assignments = await this.assignmentService.assignDriversToClusters(
      availableDrivers,
      clusters,
      facilityLocation
    );

    if (assignments.length === 0) {
      throw new BadRequestException('Không thể phân bổ tài xế cho các cụm đơn hàng');
    }

    const createdRoutes: any[] = [];

    // 6. Run the routing logic for each assigned driver and cluster
    for (const assignment of assignments) {
      const driver = availableDrivers.find((d) => d.id === assignment.driverId);
      const cluster = clusters.find((c) => c.id === assignment.clusterId);

      if (!driver || !cluster || cluster.orders.length === 0) continue;

      const activeAssignment = driver.assignments.find((a) => a.isActive);
      if (!activeAssignment) continue;

      const sortedOrders = cluster.orders;

      // Calculate planned distance and duration
      let plannedDistanceMeters = 0;
      let prevLoc = facilityLocation;

      for (const order of sortedOrders) {
        const isPickup = order.status === 'READY_FOR_PICKUP';
        const lat = (isPickup ? order.pickupLatitude : order.deliveryLatitude) || facilityLocation.lat;
        const lng = (isPickup ? order.pickupLongitude : order.deliveryLongitude) || facilityLocation.lng;
        const orderLoc = { lat, lng };
        plannedDistanceMeters += this.kmeansService.haversineDistance(
          prevLoc.lat,
          prevLoc.lng,
          orderLoc.lat,
          orderLoc.lng
        ) * 1000;
        prevLoc = orderLoc;
      }
      // Return to facility
      plannedDistanceMeters += this.kmeansService.haversineDistance(
        prevLoc.lat,
        prevLoc.lng,
        facilityLocation.lat,
        facilityLocation.lng
      ) * 1000;

      let plannedDistanceKm = Number((plannedDistanceMeters / 1000).toFixed(2));
      if (isNaN(plannedDistanceKm)) plannedDistanceKm = 0;
      // Estimate duration: average speed 30km/h + 10 mins service time per stop
      let plannedDurationMin = Math.round((plannedDistanceKm / 30) * 60 + sortedOrders.length * 10);
      if (isNaN(plannedDurationMin)) plannedDurationMin = 30;

      // 1. Create RouteOptimization log
      const optimization = await prisma.routeOptimization.create({
        data: {
          algorithmName: 'KMeans + Hungarian + GeneticAlgorithm',
          inputShipmentCount: sortedOrders.length,
          outputRouteCount: 1,
          totalDistanceKm: plannedDistanceKm,
          estimatedDurationMin: plannedDurationMin,
          executionTimeMs: 0,
          optimizationStatus: 'SUCCESS',
        },
      });

      // 2. Create Route record
      const routeCode = `RT-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
      const route = await prisma.route.create({
        data: {
          routeCode,
          driverVehicleAssignmentId: activeAssignment.id,
          startFacilityId: facilityId,
          endFacilityId: facilityId,
          optimizationId: optimization.id,
          plannedDistanceKm,
          plannedDurationMin,
          totalStops: sortedOrders.length,
          status: 'PLANNED',
          plannedStartAt: new Date(),
        },
      });

      // 3. Pre-fetch all packages for these orders in one query
      const orderIds = sortedOrders.map((o: any) => o.id);
      const allPackages = await prisma.package.findMany({
        where: { orderId: { in: orderIds } },
      });
      const packagesByOrderId = new Map<string, typeof allPackages>();
      for (const pkg of allPackages) {
        if (!packagesByOrderId.has(pkg.orderId)) {
          packagesByOrderId.set(pkg.orderId, []);
        }
        packagesByOrderId.get(pkg.orderId)!.push(pkg);
      }

      // 4. Create Shipments and RouteStops, then perform batch updates
      const pickupOrderIds: string[] = [];
      const deliveryOrderIds: string[] = [];
      const historyData: any[] = [];
      const shipmentPackagesData: any[] = [];

      let sequenceIndex = 1;
      for (const order of sortedOrders) {
        // Create Shipment record
        const shipmentCode = `SH-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        const shipment = await prisma.shipment.create({
          data: {
            shipmentCode,
            status: 'ASSIGNED',
            routeId: route.id,
            createdBy: creatorId || null,
          },
        });

        // Collect shipment package mappings
        const orderPkgs = packagesByOrderId.get(order.id) || [];
        for (const pkg of orderPkgs) {
          shipmentPackagesData.push({
            shipmentId: shipment.id,
            packageId: pkg.id,
          });
        }

        const isPickup = order.status === 'READY_FOR_PICKUP';
        const nextStatus = isPickup ? 'PICKUP_ASSIGNED' : 'IN_TRANSIT';

        if (isPickup) {
          pickupOrderIds.push(order.id);
        } else {
          deliveryOrderIds.push(order.id);
        }

        // Create RouteStop record
        await prisma.routeStop.create({
          data: {
            routeId: route.id,
            shipmentId: shipment.id,
            stopType: isPickup ? 'PICKUP' : 'DELIVERY',
            sequence: sequenceIndex++,
            addressSnapshot: (isPickup ? order.pickupAddressText : order.deliveryAddressText) || 'Unknown Address',
            latitude: (isPickup ? order.pickupLatitude : order.deliveryLatitude) || facilityLocation.lat,
            longitude: (isPickup ? order.pickupLongitude : order.deliveryLongitude) || facilityLocation.lng,
            status: 'PENDING',
          },
        });

        // Collect order status history
        historyData.push({
          orderId: order.id,
          status: nextStatus,
          changedByUserId: creatorId || null,
          changeSource: 'SYSTEM',
          reason: `Đơn hàng được AI phân bổ vào lộ trình tối ưu ${routeCode} cho tài xế ${driver.employeeCode} (${isPickup ? 'Tuyến lấy hàng' : 'Tuyến giao hàng'})`,
        });
      }

      // Batch insert shipment packages
      if (shipmentPackagesData.length > 0) {
        await prisma.shipmentPackage.createMany({ data: shipmentPackagesData });
      }

      // Batch update order statuses
      if (pickupOrderIds.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: pickupOrderIds } },
          data: { status: 'PICKUP_ASSIGNED' },
        });
      }
      if (deliveryOrderIds.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: deliveryOrderIds } },
          data: { status: 'IN_TRANSIT' },
        });
      }

      // Batch insert order status history logs
      if (historyData.length > 0) {
        await prisma.orderStatusHistory.createMany({ data: historyData });
      }

      createdRoutes.push(route);
    }

    return createdRoutes;
  }

  /**
   * Fetch all routes based on optional filters.
   */
  public async getAllRoutes(filters: { status?: any; facilityId?: string; driverId?: string }) {
    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.facilityId) {
      where.startFacilityId = filters.facilityId;
    }
    if (filters.driverId) {
      where.driverVehicleAssignment = {
        driverId: filters.driverId,
      };
    }

    return await prisma.route.findMany({
      where,
      include: {
        startFacility: {
          select: {
            id: true,
            facilityCode: true,
            facilityName: true,
            facilityAddresses: {
              include: {
                address: true,
              },
            },
          },
        },
        driverVehicleAssignment: {
          include: {
            driver: {
              select: {
                id: true,
                employeeCode: true,
                user: {
                  select: {
                    fullName: true,
                    phone: true,
                  },
                },
              },
            },
            vehicle: {
              select: {
                id: true,
                vehicleCode: true,
                licensePlate: true,
              },
            },
          },
        },
        stops: {
          include: {
            shipment: {
              include: {
                shipmentPackages: {
                  include: {
                    package: {
                      include: {
                        order: {
                          select: {
                            id: true,
                            orderCode: true,
                            receiverName: true,
                            receiverPhone: true,
                            estimatedCodAmount: true,
                            estimatedTotalAmount: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            sequence: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Fetch a route by ID, including its stops, driver info, and current real-time location from Redis.
   */
  public async getRouteDetail(routeId: string) {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        startFacility: {
          select: {
            id: true,
            facilityCode: true,
            facilityName: true,
            facilityAddresses: {
              include: {
                address: true,
              },
            },
          },
        },
        endFacility: {
          select: {
            id: true,
            facilityCode: true,
            facilityName: true,
          },
        },
        driverVehicleAssignment: {
          include: {
            driver: {
              select: {
                id: true,
                employeeCode: true,
                user: {
                  select: {
                    fullName: true,
                    phone: true,
                  },
                },
              },
            },
            vehicle: {
              select: {
                id: true,
                vehicleCode: true,
                licensePlate: true,
              },
            },
          },
        },
        stops: {
          include: {
            shipment: {
              include: {
                shipmentPackages: {
                  include: {
                    package: {
                      include: {
                        order: {
                          select: {
                            id: true,
                            orderCode: true,
                            receiverName: true,
                            receiverPhone: true,
                            estimatedCodAmount: true,
                            estimatedTotalAmount: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            sequence: 'asc',
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Không tìm thấy thông tin lộ trình');
    }

    // Query real-time GPS location from Redis
    let currentGpsLocation = null;
    try {
      const { redis } = await import('../../config/redis.js');
      const gpsDataStr = await redis.get(`driver:location:${routeId}`);
      if (gpsDataStr) {
        currentGpsLocation = JSON.parse(gpsDataStr);
      }
    } catch (err) {
      console.error('[RoutingService] Error fetching driver location from Redis:', err);
    }

    return {
      ...route,
      currentGpsLocation,
    };
  }

  /**
   * DEV UTILITY: Resets AI route optimization test data for a facility, restoring original order statuses.
   */
  public async resetFacilityAi(facilityId?: string) {
    // 1. Reset test orders back to original state
    const orderWhere: any = facilityId
      ? {
        OR: [
          { originFacilityId: facilityId },
          { destinationFacilityId: facilityId },
        ],
        deletedAt: null,
      }
      : { deletedAt: null };

    // Reset Velocity 4 pickup orders back to READY_FOR_PICKUP
    await prisma.order.updateMany({
      where: {
        ...orderWhere,
        orderCode: { startsWith: 'ORD_V4_PICKUP_' },
      },
      data: { status: 'READY_FOR_PICKUP' },
    });

    // Reset Velocity 3 delivery orders back to AT_HUB
    await prisma.order.updateMany({
      where: {
        ...orderWhere,
        orderCode: { startsWith: 'ORD_V3_HUB_' },
      },
      data: { status: 'AT_HUB' },
    });

    // Also reset any status changes for test orders
    await prisma.order.updateMany({
      where: {
        ...orderWhere,
        status: { in: ['PICKUP_ASSIGNED', 'PICKING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
      },
      data: { status: 'READY_FOR_PICKUP' },
    });

    // 2. Find routes created for this facility (excluding base seed routes RTE_1000 to RTE_1004)
    const routeWhere: any = facilityId
      ? { startFacilityId: facilityId }
      : {};

    const routesToDelete = await prisma.route.findMany({
      where: {
        ...routeWhere,
        routeCode: { notIn: ['RTE_1000', 'RTE_1001', 'RTE_1002', 'RTE_1003', 'RTE_1004'] },
      },
      select: { id: true },
    });

    const routeIds = routesToDelete.map((r) => r.id);

    if (routeIds.length > 0) {
      // Clean up child tables
      await prisma.driverCheckIn.deleteMany({ where: { routeStop: { routeId: { in: routeIds } } } });
      await prisma.routeLocationLog.deleteMany({ where: { routeId: { in: routeIds } } });
      await prisma.dispatchTask.deleteMany({ where: { routeId: { in: routeIds } } });
      await prisma.routeStop.deleteMany({ where: { routeId: { in: routeIds } } });

      // Delete shipments created for these routes
      const shipments = await prisma.shipment.findMany({ where: { routeId: { in: routeIds } }, select: { id: true } });
      const shipmentIds = shipments.map(s => s.id);
      if (shipmentIds.length > 0) {
        await prisma.shipmentPackage.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
        await prisma.shipmentTransfer.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
        await prisma.shipmentEvent.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
        await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
      }

      await prisma.route.deleteMany({ where: { id: { in: routeIds } } });
    }

    // Clean up RouteOptimization records
    await prisma.routeOptimization.deleteMany({});

    return {
      resetOrdersCount: 80,
      deletedRoutesCount: routeIds.length,
    };
  }
}

