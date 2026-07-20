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

    // 4. Cluster orders using K-Means
    const K = Math.min(availableDrivers.length, orders.length);
    const clusters = this.kmeansService.clusterOrders(orders, K);

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

      // Optimize order sequence using VRP (Genetic Algorithm)
      const sortedOrders = await this.vrpService.optimizeRouteStops(
        cluster.orders,
        facilityLocation
      );

      // Calculate planned distance and duration
      let plannedDistanceMeters = 0;
      let prevLoc = facilityLocation;

      for (const order of sortedOrders) {
        const orderLoc = { lat: order.deliveryLatitude!, lng: order.deliveryLongitude! };
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

      const plannedDistanceKm = plannedDistanceMeters / 1000;
      // Estimate duration: average speed 30km/h + 10 mins service time per stop
      const plannedDurationMin = Math.round((plannedDistanceKm / 30) * 60 + sortedOrders.length * 10);

      // Save to database inside a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create RouteOptimization log
        const optimization = await tx.routeOptimization.create({
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

        // Create Route record
        const routeCode = `RT-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        const route = await tx.route.create({
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

        // Create RouteStops and Shipments for each stop
        let sequenceIndex = 1;
        for (const order of sortedOrders) {
          // Create Shipment record
          const shipmentCode = `SH-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
          const shipment = await tx.shipment.create({
            data: {
              shipmentCode,
              status: 'ASSIGNED',
              routeId: route.id,
              createdBy: creatorId,
            },
          });

          // Create ShipmentPackage records
          const packages = await tx.package.findMany({
            where: { orderId: order.id },
          });

          for (const pkg of packages) {
            await tx.shipmentPackage.create({
              data: {
                shipmentId: shipment.id,
                packageId: pkg.id,
              },
            });
          }

          const isPickup = order.status === 'READY_FOR_PICKUP';
          const nextStatus = isPickup ? 'PICKUP_ASSIGNED' : 'IN_TRANSIT';

          // Create RouteStop record
          await tx.routeStop.create({
            data: {
              routeId: route.id,
              shipmentId: shipment.id,
              stopType: isPickup ? 'PICKUP' : 'DELIVERY',
              sequence: sequenceIndex++,
              addressSnapshot: (isPickup ? order.pickupAddressText : order.deliveryAddressText) || 'Unknown Address',
              latitude: (isPickup ? order.pickupLatitude : order.deliveryLatitude)!,
              longitude: (isPickup ? order.pickupLongitude : order.deliveryLongitude)!,
              status: 'PENDING',
            },
          });

          // Update Order Status after AI assignment
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
            },
          });

          // Add to order status history
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: nextStatus,
              changedByUserId: creatorId,
              changeSource: 'SYSTEM',
              reason: `Đơn hàng được AI phân bổ vào lộ trình tối ưu ${routeCode} cho tài xế ${driver.fullName} (${isPickup ? 'Tuyến lấy hàng' : 'Tuyến giao hàng'})`,
            },
          });
        }

        return route;
      });

      createdRoutes.push(result);
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
}

