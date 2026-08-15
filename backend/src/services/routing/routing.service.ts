import { prisma } from '../../config/prisma';
import { KMeansService } from './kmeans.service';
import { AssignmentService } from './assignment.service';
import { VRPService } from './vrp.service';
import { BadRequestException, NotFoundException } from '../../middlewares/error.middleware';
import { getTrackingGateway } from '../../gateways/tracking.gateway';
import { OrderStatus, RouteStatus, RouteStopStatus, DriverEmploymentStatus, TransferStatus } from '@prisma/client';

export class RoutingService {
  private kmeansService = new KMeansService();
  private assignmentService = new AssignmentService();
  private vrpService = new VRPService();

  /**
   * Triggers the AI routing optimization pipeline for a facility.
   */
  public async optimizeRoutesForFacility(facilityId: string, creatorId: string, routeType: string = 'ALL') {
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
      lat: facility.address?.latitude || 10.7728,
      lng: facility.address?.longitude || 106.6582,
    };

    // 2. Fetch all orders ready for AI routing at this facility based on routeType (PICKUP, DELIVERY, or ALL)
    let orderConditions: any[] = [];
    if (routeType === 'PICKUP') {
      orderConditions.push({
        originFacilityId: facilityId,
        status: OrderStatus.READY_FOR_PICKUP,
      });
    } else if (routeType === 'DELIVERY') {
      orderConditions.push({
        destinationFacilityId: facilityId,
        status: OrderStatus.AT_HUB,
      });
    } else {
      // ALL / Dual-flag (Cờ Kép)
      orderConditions.push({
        originFacilityId: facilityId,
        status: OrderStatus.READY_FOR_PICKUP,
      });
      orderConditions.push({
        destinationFacilityId: facilityId,
        status: OrderStatus.AT_HUB,
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: orderConditions,
      },
      include: {
        package: true,
      },
    });

    if (orders.length === 0) {
      const typeLabel = routeType === 'PICKUP' ? 'LẤY HÀNG (READY_FOR_PICKUP)' : routeType === 'DELIVERY' ? 'GIAO HÀNG (AT_HUB)' : 'Lấy hàng / Giao hàng';
      throw new BadRequestException(`Không có đơn hàng nào ở trạng thái "${typeLabel}" tại bưu cục này`);
    }

    console.log(`🔍 [AI DEBUG] 1. Total Orders fetched for facility ${facilityId} (routeType: ${routeType}): ${orders.length}`);

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
        driverTypes: true,
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
    let totalOptimizationDistanceKm = 0;
    let totalOptimizationDurationMin = 0;

    // 5b. Create a single RouteOptimization record for the entire AI Optimization session
    const optimization = await prisma.routeOptimization.create({
      data: {
        algorithmName: 'KMeans + Hungarian + GeneticAlgorithm',
        inputShipmentCount: orders.length,
        outputRouteCount: 0,
        optimizationStatus: 'SUCCESS',
      },
    });

    // 6. Run the routing logic for each assigned driver and cluster
    for (const assignment of assignments) {
      const driver = availableDrivers.find((d) => d.id === assignment.driverId);
      const cluster = clusters[assignment.clusterId] || clusters.find((c: any) => c.id === assignment.clusterId);

      if (!driver || !cluster || !cluster.orders || cluster.orders.length === 0) continue;

      let activeAssignment = driver.assignments?.find((a) => a.isActive);

      if (!activeAssignment) {
        let vehicle = await prisma.vehicle.findFirst({
          where: { assignedFacilityId: facilityId, operatingStatus: 'ACTIVE' },
        });
        if (!vehicle) {
          vehicle = await prisma.vehicle.findFirst({
            where: { operatingStatus: 'ACTIVE' },
          });
        }
        if (!vehicle) {
          vehicle = await prisma.vehicle.findFirst();
        }

        if (vehicle) {
          activeAssignment = (await prisma.driverVehicleAssignment.create({
            data: {
              driverId: driver.id,
              vehicleId: vehicle.id,
              assignedFrom: new Date(),
              isActive: true,
            },
            include: {
              driver: true,
              vehicle: true,
            },
          })) as any;
        }
      }

      const sortedOrders = cluster.orders;

      // Calculate planned distance and duration
      let plannedDistanceMeters = 0;
      let prevLoc = facilityLocation;

      for (const order of sortedOrders) {
        const isPickup = order.status !== OrderStatus.AT_HUB && order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.DELIVERED;
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

      totalOptimizationDistanceKm += plannedDistanceKm;
      totalOptimizationDurationMin += plannedDurationMin;

      // 2. Create Route record
      const routeCode = `RT-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
      const route = await prisma.route.create({
        data: {
          routeCode,
          driverVehicleAssignmentId: activeAssignment?.id || null,
          startFacilityId: facilityId,
          endFacilityId: facilityId,
          optimizationId: optimization.id,
          plannedDistanceKm,
          plannedDurationMin,
          totalStops: sortedOrders.length,
          status: 'PLANNED',
        },
      });

      // 2b. Automatically create a DispatchTask for the assigned driver
      const taskCode = `TSK-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.dispatchTask.create({
        data: {
          taskCode,
          routeId: route.id,
          assignedBy: creatorId || driver.userId,
          assignedTo: driver.id,
          taskType: 'ASSIGN_ROUTE',
          priority: 1,
          status: 'PENDING',
        },
      });
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
        const originFacId = order.originFacilityId || facilityId;
        const destFacId = order.destinationFacilityId || facilityId;

        const shipment = await prisma.shipment.create({
          data: {
            shipmentCode,
            status: 'ASSIGNED',
            routeId: route.id,
            originFacilityId: originFacId,
            destinationFacilityId: destFacId,
            createdBy: creatorId || null,
          },
        });

        if (originFacId && destFacId && originFacId !== destFacId) {
          await prisma.shipmentTransfer.create({
            data: {
              shipmentId: shipment.id,
              fromFacilityId: originFacId,
              toFacilityId: destFacId,
              status: TransferStatus.PENDING,
            },
          });
        }

        const isPickup = order.status !== OrderStatus.AT_HUB && order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.DELIVERED;
        const nextStatus = isPickup ? OrderStatus.PICKUP_ASSIGNED : OrderStatus.READY_FOR_DISPATCH;

        if (isPickup) {
          pickupOrderIds.push(order.id);
        } else {
          deliveryOrderIds.push(order.id);
        }

        // Create RouteStop record first
        const routeStop = await prisma.routeStop.create({
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

        // Insert initial TrackingEvent log with routeStopId linked
        await prisma.trackingEvent.create({
          data: {
            shipmentId: shipment.id,
            routeStopId: routeStop.id,
            eventType: 'DRIVER_ASSIGNED',
            description: `Vận đơn ${shipmentCode} đã được hệ thống AI phân tuyến cho tài xế`,
            latitude: facilityLocation.lat,
            longitude: facilityLocation.lng,
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
          data: { status: OrderStatus.PICKUP_ASSIGNED },
        });
      }
      if (deliveryOrderIds.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: deliveryOrderIds } },
          data: { status: OrderStatus.READY_FOR_DISPATCH },
        });
      }

      // Batch insert order status history logs
      if (historyData.length > 0) {
        await prisma.orderStatusHistory.createMany({ data: historyData });
      }

      createdRoutes.push(route);
    }

    // 7. Update the RouteOptimization log with final output route count
    await prisma.routeOptimization.update({
      where: { id: optimization.id },
      data: {
        outputRouteCount: createdRoutes.length,
      },
    });

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
        { driverVehicleAssignment: { driverId: filters.driverId } },
        { driverVehicleAssignment: { driver: { userId: filters.driverId } } },
      ];
    }

    const routes = await prisma.route.findMany({
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
                plateNumber: true,
              },
            },
          },
        },
        stops: {
          include: {
            facility: {
              select: {
                id: true,
                facilityCode: true,
                facilityName: true,
                address: {
                  select: {
                    addressLine1: true,
                    latitude: true,
                    longitude: true,
                  },
                },
              },
            },
            order: {
              select: {
                id: true,
                orderCode: true,
                status: true,
                receiverName: true,
                receiverPhone: true,
                estimatedCodAmount: true,
                estimatedShippingFee: true,
                estimatedInsuranceFee: true,
                payment: {
                  select: {
                    feePayer: true,
                    paymentMethod: true,
                    paymentStatus: true,
                    finalShippingFee: true,
                    finalInsuranceFee: true,
                    finalCodAmount: true,
                  },
                },
              },
            },
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
                            status: true,
                            receiverName: true,
                            receiverPhone: true,
                            estimatedCodAmount: true,
                            estimatedShippingFee: true,
                            estimatedInsuranceFee: true,
                            payment: {
                              select: {
                                feePayer: true,
                                paymentMethod: true,
                                paymentStatus: true,
                                finalShippingFee: true,
                                finalInsuranceFee: true,
                                finalCodAmount: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                warehouseScans: {
                  include: {
                    toteBag: {
                      select: {
                        id: true,
                        toteCode: true,
                        zoneCode: true,
                        status: true,
                      },
                    },
                  },
                },
                shipmentTransfers: true,
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

    // Populate real-time GPS coordinates from Redis for each route
    return await Promise.all(
      routes.map(async (route) => {
        let currentGpsLocation = null;
        try {
          const { redis } = await import('../../config/redis.js');
          const gpsDataStr = await redis.get(`driver:location:${route.id}`);
          if (gpsDataStr) {
            currentGpsLocation = JSON.parse(gpsDataStr);
          }
        } catch (err) {
          // Redis error silent fallback
        }
        return {
          ...route,
          currentGpsLocation,
        };
      })
    );
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
                plateNumber: true,
              },
            },
          },
        },
        stops: {
          include: {
            facility: {
              select: {
                id: true,
                facilityCode: true,
                facilityName: true,
                address: {
                  select: {
                    addressLine1: true,
                    latitude: true,
                    longitude: true,
                  },
                },
              },
            },
            order: {
              select: {
                id: true,
                orderCode: true,
                status: true,
                receiverName: true,
                receiverPhone: true,
                deliveryAddressText: true,
                pickupAddressText: true,
                estimatedCodAmount: true,
                estimatedShippingFee: true,
                estimatedInsuranceFee: true,
                payment: {
                  select: {
                    feePayer: true,
                    paymentMethod: true,
                    paymentStatus: true,
                    finalShippingFee: true,
                    finalInsuranceFee: true,
                    finalCodAmount: true,
                  },
                },
              },
            },
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
                            status: true,
                            receiverName: true,
                            receiverPhone: true,
                            deliveryAddressText: true,
                            pickupAddressText: true,
                            estimatedCodAmount: true,
                            estimatedShippingFee: true,
                            estimatedInsuranceFee: true,
                            payment: {
                              select: {
                                feePayer: true,
                                paymentMethod: true,
                                paymentStatus: true,
                                finalShippingFee: true,
                                finalInsuranceFee: true,
                                finalCodAmount: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                warehouseScans: {
                  include: {
                    toteBag: {
                      select: {
                        id: true,
                        toteCode: true,
                        zoneCode: true,
                        status: true,
                      },
                    },
                  },
                },
                shipmentTransfers: true,
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
          status: { in: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.PICKUP_ASSIGNED, OrderStatus.PICKING, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] },
        },
        data: { status: OrderStatus.AT_HUB },
      });

      // Pickup orders waiting for pickup at origin facility -> Reset to READY_FOR_PICKUP
      await prisma.order.updateMany({
        where: {
          originFacilityId: validFacilityId,
          destinationFacilityId: { not: validFacilityId },
          status: { in: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.PICKUP_ASSIGNED, OrderStatus.PICKING, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] },
        },
        data: { status: OrderStatus.READY_FOR_PICKUP },
      });
    } else {
      // Global reset fallback: reset all delivery orders in-transit back to AT_HUB
      await prisma.order.updateMany({
        where: {
          status: { in: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.PICKUP_ASSIGNED, OrderStatus.PICKING, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] },
        },
        data: { status: OrderStatus.AT_HUB },
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
      await prisma.dispatchTask.deleteMany({ where: { routeId: { in: routeIds } } });
      await prisma.routeAdjustmentLog.deleteMany({ where: { routeId: { in: routeIds } } });
      await prisma.routeStop.deleteMany({ where: { routeId: { in: routeIds } } });

      // Delete shipments created for these routes
      const shipments = await prisma.shipment.findMany({ where: { routeId: { in: routeIds } }, select: { id: true } });
      const shipmentIds = shipments.map(s => s.id);
      if (shipmentIds.length > 0) {
        await prisma.shipmentPackage.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
        await prisma.shipmentTransfer.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
        await prisma.trackingEvent.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
        await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
      }

      await prisma.route.deleteMany({ where: { id: { in: routeIds } } });
    }

    // Clean up RouteOptimization records
    await prisma.routeOptimization.deleteMany({});

    // Clean up order status history entries generated by AI routing or transit/delivery statuses
    await prisma.orderStatusHistory.deleteMany({
      where: {
        OR: [
          {
            status: {
              in: [
                OrderStatus.READY_FOR_DISPATCH,
                OrderStatus.PICKUP_ASSIGNED,
                OrderStatus.PICKING,
                OrderStatus.PICKED_UP,
                OrderStatus.IN_TRANSIT,
                OrderStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
          { reason: { contains: 'Đơn hàng được AI phân bổ' } },
          { reason: { contains: 'Tài xế' } },
        ],
      },
    });

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
    // Check if routeId is a valid UUID format before querying by id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(routeId);

    const route = await prisma.route.findFirst({
      where: isUuid
        ? { OR: [{ id: routeId }, { routeCode: routeId }] }
        : { routeCode: routeId },
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
            { package: { currentFacilityId: route.startFacilityId } },
          ],
          status: { in: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.PICKUP_ASSIGNED] },
        },
        select: { id: true },
        take: route.totalStops || 50,
      });
      facilityOrders.forEach(o => orderIds.push(o.id));
    }


    // Always assign/re-assign driverVehicleAssignment to the driver who scanned and started this route
    let assignmentId = route.driverVehicleAssignmentId;
    if (userId) {
      const staff = await prisma.staff.findFirst({ where: { userId } });
      if (staff) {
        let assignment = await prisma.driverVehicleAssignment.findFirst({
          where: { driverId: staff.id, isActive: true },
        });
        if (!assignment) {
          const vehicle = (await prisma.vehicle.findFirst({ where: { operatingStatus: 'ACTIVE' } }))
            || (await prisma.vehicle.findFirst());
          if (vehicle) {
            assignment = await prisma.driverVehicleAssignment.create({
              data: {
                driverId: staff.id,
                vehicleId: vehicle.id,
                assignedFrom: new Date(),
                isActive: true,
              },
            });
          }
        }
        if (assignment) {
          assignmentId = assignment.id;
        }
      }
    }


    // Update Route status to IN_PROGRESS
    const updatedRoute = await prisma.route.update({
      where: { id: route.id },
      data: {
        status: 'IN_PROGRESS',
        actualStartAt: new Date(),
        ...(assignmentId ? { driverVehicleAssignmentId: assignmentId } : {}),
      },
    });


    await prisma.routeStop.updateMany({
      where: { routeId: route.id, status: 'PENDING' },
      data: { status: RouteStopStatus.ARRIVED },
    });

    // Update related orders status: PICKING for pickup orders, OUT_FOR_DELIVERY for delivery orders


    if (orderIds.length > 0) {
      const uniqueOrderIds = Array.from(new Set(orderIds));
      const ordersToUpdate = await prisma.order.findMany({
        where: { id: { in: uniqueOrderIds } },
        select: { id: true, status: true },
      });

      const pickupOrderIds: string[] = [];
      const deliveryOrderIds: string[] = [];

      ordersToUpdate.forEach((o) => {
        if (
          o.status === OrderStatus.READY_FOR_PICKUP ||
          o.status === OrderStatus.PICKUP_ASSIGNED ||
          o.status === OrderStatus.PICKING
        ) {
          pickupOrderIds.push(o.id);
        } else {
          deliveryOrderIds.push(o.id);
        }
      });

      const historyLogs: any[] = [];

      // Update Pickup Orders to OrderStatus.PICKING ("SHIPPER ĐANG ĐẾN LẤY HÀNG")
      if (pickupOrderIds.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: pickupOrderIds } },
          data: { status: OrderStatus.PICKING },
        });

        pickupOrderIds.forEach((orderId) => {
          historyLogs.push({
            orderId,
            status: OrderStatus.PICKING,
            changedByUserId: userId || null,
            reason: `Tài xế đã nhận tuyến Sọt ${route.routeCode || route.id} và đang di chuyển đến địa chỉ người gửi để lấy hàng`,
          });
        });
      }

      // Update Delivery Orders to OrderStatus.OUT_FOR_DELIVERY ("SHIPPER ĐANG GIAO HÀNG")
      if (deliveryOrderIds.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: deliveryOrderIds } },
          data: { status: OrderStatus.OUT_FOR_DELIVERY },
        });

        deliveryOrderIds.forEach((orderId) => {
          historyLogs.push({
            orderId,
            status: OrderStatus.OUT_FOR_DELIVERY,
            changedByUserId: userId || null,
            reason: `Tài xế đã quét mã QR Sọt ${route.routeCode || route.id} và đang di chuyển đi giao hàng cho người nhận`,
          });
        });
      }

      if (historyLogs.length > 0) {
        await prisma.orderStatusHistory.createMany({ data: historyLogs as any });
      }
    }

    getTrackingGateway()?.broadcastRoutesUpdated();

    return updatedRoute;
  }

  /**
   * Confirm Route Complete & Liberate Driver for Next Assignment (POST /routes/:id/complete)
   */
  public async confirmRouteComplete(routeId: string, userId?: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(routeId);

    const route = await prisma.route.findFirst({
      where: isUuid
        ? { OR: [{ id: routeId }, { routeCode: routeId }] }
        : { routeCode: routeId },
    });

    if (!route) {
      throw new NotFoundException('Không tìm thấy lộ trình / chuyến đi này');
    }

    // 1. Mark all route stops as DEPARTED
    await prisma.routeStop.updateMany({
      where: { routeId: route.id },
      data: { status: RouteStopStatus.DEPARTED },
    });

    // 2. Mark Route status as COMPLETED
    const updatedRoute = await prisma.route.update({
      where: { id: route.id },
      data: {
        status: RouteStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // 3. Liberate Driver Vehicle Assignment (set isActive = true)
    if (route.driverVehicleAssignmentId) {
      await prisma.driverVehicleAssignment.update({
        where: { id: route.driverVehicleAssignmentId },
        data: { isActive: true },
      });
    }

    // 4. Update Staff driver employmentStatus to ACTIVE if applicable
    if (userId) {
      const staffProfile = await prisma.staff.findFirst({ where: { userId } });
      if (staffProfile) {
        await prisma.staff.update({
          where: { id: staffProfile.id },
          data: { employmentStatus: DriverEmploymentStatus.ACTIVE },
        });
      }
    }

    getTrackingGateway()?.broadcastRoutesUpdated();

    return updatedRoute;
  }
}

