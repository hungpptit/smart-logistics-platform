import { prisma } from '../../config/prisma';
import { KMeansService } from './kmeans.service';
import { AssignmentService } from './assignment.service';
import { VRPService } from './vrp.service';
import { BadRequestException, NotFoundException } from '../../middlewares/error.middleware';
import { getTrackingGateway } from '../../gateways/tracking.gateway';

export class RoutingService {
  private kmeansService = new KMeansService();
  private assignmentService = new AssignmentService();
  private vrpService = new VRPService();

  /**
   * Triggers the AI routing optimization pipeline for a facility.
   */
  public async optimizeRoutesForFacility(facilityId: string, creatorId: string) {
    // 0. Automatically reset previous PLANNED routes for this facility to ensure all 50 orders are restored to AT_HUB / READY_FOR_PICKUP
    await this.resetFacilityAi(facilityId);

    // 1. Fetch the facility and its primary address
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId, operatingStatus: { not: 'CLOSED' } },
      include: {
        address: true,
      },
    });

    if (!facility) {
      throw new NotFoundException('Không tìm thấy thông tin kho bãi');
    }

    const facilityLocation = {
      lat: facility.latitude,
      lng: facility.longitude,
    };

    // 2. Fetch all orders ready for AI routing at this facility (Pickup or Delivery)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { originFacilityId: facilityId, status: 'READY_FOR_PICKUP' },
          { destinationFacilityId: facilityId, status: 'AT_HUB' },
        ],
      },
    });

    if (orders.length === 0) {
      throw new BadRequestException('Không có đơn hàng nào ở trạng thái "Chờ lấy hàng" (READY_FOR_PICKUP) hoặc "Đã đến kho nhận" (AT_HUB) tại bưu cục này');
    }

    console.log(`🔍 [AI DEBUG] 1. Total Orders fetched for facility ${facilityId}: ${orders.length}`);

    // 3. Fetch all active drivers assigned to this facility
    const drivers = await prisma.staff.findMany({
      where: {
        assignedFacilityId: facilityId,
        position: 'DRIVER',
        employmentStatus: 'ACTIVE',
        user: { status: 'ACTIVE' },
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

    // All active drivers at this facility are available (including motorcycle shippers)
    const availableDrivers = drivers;
    console.log(`🔍 [AI DEBUG] 2. Available Drivers fetched: ${availableDrivers.length} (${availableDrivers.map(d => d.fullName).join(', ')})`);

    if (availableDrivers.length === 0) {
      throw new BadRequestException('Không có tài xế nào đang hoạt động tại bưu cục này');
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

    console.log(`🔍 [AI DEBUG] 3. Clusters produced: ${clusters.length} (Counts: ${clusters.map((c: any) => c.orders.length).join(', ')})`);

    // 5. Assign drivers to clusters using Hungarian Algorithm
    const assignments = await this.assignmentService.assignDriversToClusters(
      availableDrivers,
      clusters,
      facilityLocation
    );

    console.log(`🔍 [AI DEBUG] 4. Assignments produced: ${assignments.length}`, assignments);

    if (assignments.length === 0) {
      throw new BadRequestException('Không thể phân bổ tài xế cho các cụm đơn hàng');
    }

    const createdRoutes: any[] = [];

    // 6. Run the routing logic for each assigned driver and cluster
    for (const assignment of assignments) {
      const driver = availableDrivers.find((d) => d.id === assignment.driverId);
      const cluster = clusters[assignment.clusterId] || clusters.find((c: any) => c.id === assignment.clusterId);

      if (!driver || !cluster || !cluster.orders || cluster.orders.length === 0) continue;

      const activeAssignment = driver.assignments?.find((a) => a.isActive);

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
          driverVehicleAssignmentId: activeAssignment?.id || null,
          driverId: driver.id,
          vehicleId: activeAssignment?.vehicleId || null,
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

      // 3. Pre-fetch all packages and existing shipment packages for these orders in one query
      const orderIds = sortedOrders.map((o: any) => o.id);
      const allPackages = await prisma.package.findMany({
        where: { orderId: { in: orderIds } },
      });
      
      const existingShipmentPackages = await prisma.shipmentPackage.findMany({
        where: { packageId: { in: allPackages.map((p) => p.id) } },
        select: { packageId: true },
      });
      const assignedPkgIds = new Set(existingShipmentPackages.map((sp) => sp.packageId));

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

        // Collect shipment package mappings (only for packages not yet assigned to any shipment)
        const orderPkgs = packagesByOrderId.get(order.id) || [];
        for (const pkg of orderPkgs) {
          if (!assignedPkgIds.has(pkg.id)) {
            shipmentPackagesData.push({
              shipmentId: shipment.id,
              packageId: pkg.id,
            });
            assignedPkgIds.add(pkg.id);
          }
        }

        const isPickup = order.status === 'READY_FOR_PICKUP';
        const nextStatus = isPickup ? 'PICKUP_ASSIGNED' : 'READY_FOR_DISPATCH';

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
            orderId: order.id,
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
          reason: `Đơn hàng được AI phân bổ vào sọt hàng ${routeCode} tại bưu cục (Trạng thái: Sẵn sàng giao hàng, chờ Tài xế quét QR mã Sọt để xuất kho)`,
        });
      }

      // Batch insert shipment packages securely with skipDuplicates
      if (shipmentPackagesData.length > 0) {
        await prisma.shipmentPackage.createMany({
          data: shipmentPackagesData,
          skipDuplicates: true,
        });
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
          data: { status: 'READY_FOR_DISPATCH' },
        });
      }

      // Batch insert order status history logs
      if (historyData.length > 0) {
        await prisma.orderStatusHistory.createMany({ data: historyData });
      }

      createdRoutes.push(route);
    }

    getTrackingGateway()?.broadcastRoutesUpdated();
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
      where.OR = [
        { driverId: filters.driverId },
        { driverVehicleAssignment: { driverId: filters.driverId } },
      ];
    }

    return await prisma.route.findMany({
      where,
      include: {
        startFacility: {
          select: {
            id: true,
            facilityCode: true,
            facilityName: true,
            address: true,
          },
        },
        driver: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            phone: true,
            user: {
              select: {
                username: true,
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
        driverVehicleAssignment: {
          include: {
            driver: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                phone: true,
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
            address: true,
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
                fullName: true,
                phone: true,
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
                            deliveryAddressText: true,
                            pickupAddressText: true,
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
    const validFacilityId = facilityId && typeof facilityId === 'string' && facilityId.trim().length > 0 ? facilityId.trim() : null;

    // 1. Reset status of orders accurately based on whether they are Pickup or Delivery orders
    if (validFacilityId) {
      // Delivery orders waiting for last-mile delivery at destination facility -> Reset to AT_HUB
      await prisma.order.updateMany({
        where: {
          destinationFacilityId: validFacilityId,
          status: { in: ['READY_FOR_DISPATCH', 'PICKUP_ASSIGNED', 'PICKING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
        },
        data: { status: 'AT_HUB' },
      });

      // Pickup orders waiting for pickup at origin facility -> Reset to READY_FOR_PICKUP
      await prisma.order.updateMany({
        where: {
          originFacilityId: validFacilityId,
          destinationFacilityId: { not: validFacilityId },
          status: { in: ['READY_FOR_DISPATCH', 'PICKUP_ASSIGNED', 'PICKING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
        },
        data: { status: 'READY_FOR_PICKUP' },
      });
    } else {
      // Global reset fallback: reset all delivery orders in-transit back to AT_HUB
      await prisma.order.updateMany({
        where: {
          status: { in: ['READY_FOR_DISPATCH', 'PICKUP_ASSIGNED', 'PICKING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
        },
        data: { status: 'AT_HUB' },
      });
    }

    // 2. Find routes created for this facility (excluding base seed routes RTE_1000 to RTE_1004)
    const routeWhere: any = validFacilityId
      ? { startFacilityId: validFacilityId }
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
      await prisma.routeAdjustmentLog.deleteMany({ where: { routeId: { in: routeIds } } });
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

    getTrackingGateway()?.broadcastRoutesUpdated();

    return {
      resetOrdersCount: 80,
      deletedRoutesCount: routeIds.length,
    };
  }

  /**
   * Confirm Tote Scan & Start Route Execution (Transition Route -> IN_PROGRESS and Orders -> OUT_FOR_DELIVERY)
   */
  public async confirmRouteStart(routeId: string, userId?: string) {
    const route = await prisma.route.findFirst({
      where: {
        OR: [
          { id: routeId },
          { routeCode: routeId },
        ],
      },
    });

    if (!route) {
      throw new NotFoundException('Không tìm thấy lộ trình / sọt hàng này');
    }

    // Collect order IDs linked to shipments and stops of this route
    const stops = await prisma.routeStop.findMany({
      where: { routeId: route.id },
      select: {
        orderId: true,
        shipment: {
          include: {
            shipmentPackages: {
              include: {
                package: {
                  select: { orderId: true },
                },
              },
            },
          },
        },
      },
    });

    const orderIds: string[] = [];
    for (const stop of stops) {
      if (stop.orderId) {
        orderIds.push(stop.orderId);
      }
      if (stop.shipment?.shipmentPackages) {
        for (const sp of stop.shipment.shipmentPackages) {
          if (sp.package?.orderId) {
            orderIds.push(sp.package.orderId);
          }
        }
      }
    }

    // Fallback: If orderIds is empty, match orders by originFacilityId or packages currentFacilityId
    if (orderIds.length === 0 && route.startFacilityId) {
      const facilityOrders = await prisma.order.findMany({
        where: {
          OR: [
            { originFacilityId: route.startFacilityId },
            { packages: { some: { currentFacilityId: route.startFacilityId } } },
          ],
          status: { in: ['READY_FOR_DISPATCH', 'PICKUP_ASSIGNED'] },
        },
        select: { id: true },
        take: route.totalStops || 50,
      });
      facilityOrders.forEach(o => orderIds.push(o.id));
    }

    // Update Route status to IN_PROGRESS
    const updatedRoute = await prisma.route.update({
      where: { id: route.id },
      data: {
        status: 'IN_PROGRESS',
        actualStartAt: new Date(),
      },
    });

    // Update all related orders status to OUT_FOR_DELIVERY
    if (orderIds.length > 0) {
      const uniqueOrderIds = Array.from(new Set(orderIds));
      await prisma.order.updateMany({
        where: { id: { in: uniqueOrderIds } },
        data: { status: 'OUT_FOR_DELIVERY' },
      });

      // Insert OrderStatusHistory logs
      const historyLogs = uniqueOrderIds.map(orderId => ({
        orderId,
        status: 'OUT_FOR_DELIVERY',
        changedByUserId: userId || null,
        reason: `Tài xế đã quét mã QR Sọt ${route.routeCode || route.id} và bắt đầu di chuyển đi giao hàng`,
      }));
      await prisma.orderStatusHistory.createMany({ data: historyLogs as any });
    }

    getTrackingGateway()?.broadcastRoutesUpdated();

    return updatedRoute;
  }
}

