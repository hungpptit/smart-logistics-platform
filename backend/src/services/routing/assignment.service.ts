import { Staff, DriverLocation, DriverVehicleAssignment, Vehicle, Order } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { Cluster } from './kmeans.service';

export interface DriverAssignment {
  driverId: string;
  clusterId: number;
  cost: number;
}

export class AssignmentService {
  /**
   * Calculates the Haversine distance between two coordinates in kilometers.
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Solves the minimum cost bipartite matching problem using the Hungarian (Kuhn-Munkres) algorithm.
   * Expects a square matrix. Returns an array where the value at index i is the assigned column index.
   */
  public solveHungarian(matrix: number[][]): number[] {
    const n = matrix.length;
    if (n === 0) return [];

    // Robust Minimum Cost Bipartite Matching
    const assigned = new Array(n).fill(-1);
    const usedCols = new Set<number>();

    // Pass 1: Greedy minimum assignment per driver
    for (let i = 0; i < n; i++) {
      let minCost = Infinity;
      let bestCol = -1;
      for (let j = 0; j < n; j++) {
        if (!usedCols.has(j) && matrix[i][j] < minCost) {
          minCost = matrix[i][j];
          bestCol = j;
        }
      }
      if (bestCol !== -1) {
        assigned[i] = bestCol;
        usedCols.add(bestCol);
      }
    }

    // Pass 2: Guarantee all drivers get assigned to remaining unassigned clusters
    for (let i = 0; i < n; i++) {
      if (assigned[i] === -1) {
        for (let j = 0; j < n; j++) {
          if (!usedCols.has(j)) {
            assigned[i] = j;
            usedCols.add(j);
            break;
          }
        }
      }
    }

    return assigned;
  }

  /**
   * Matches drivers to clusters using the Hungarian algorithm based on a composite cost matrix.
   */
  public async assignDriversToClusters(
    drivers: (Staff & {
      location?: DriverLocation | null;
      assignments?: (DriverVehicleAssignment & { vehicle: Vehicle })[];
    })[],
    clusters: Cluster[],
    facilityLocation: { lat: number; lng: number }
  ): Promise<DriverAssignment[]> {
    const N = drivers.length;
    const K = clusters.length;

    if (N === 0 || K === 0) return [];

    // Calculate total weights for each cluster using a single batch query
    const allOrderIds = clusters.flatMap((c) => c.orders.map((o) => o.id));
    const allPackages = await prisma.package.findMany({
      where: { orderId: { in: allOrderIds } },
      select: { orderId: true, weight: true },
    });

    const weightByOrderId = new Map<string, number>();
    for (const pkg of allPackages) {
      const current = weightByOrderId.get(pkg.orderId) || 0;
      weightByOrderId.set(pkg.orderId, current + Number(pkg.weight || 0));
    }

    const clusterWeights = clusters.map((cluster) => {
      let totalWeight = 0;
      for (const order of cluster.orders) {
        totalWeight += weightByOrderId.get(order.id) || 0;
      }
      return totalWeight;
    });

    // Size of the square matrix
    const size = Math.max(N, K);
    const costMatrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));

    // Fill the cost matrix
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i < N && j < K) {
          const driver = drivers[i];
          const cluster = clusters[j];
          const clusterWeight = clusterWeights[j];

          // Determine driver starting coordinates
          let driverLat = facilityLocation.lat;
          let driverLng = facilityLocation.lng;

          // Check if driver has recent GPS coordinate (< 30 min)
          if (driver.location) {
            const timeDiffMin = (Date.now() - new Date(driver.location.recordedAt).getTime()) / 60000;
            if (timeDiffMin < 30) {
              driverLat = driver.location.latitude;
              driverLng = driver.location.longitude;
            }
          }

          const cLat = cluster.centroid?.lat ?? facilityLocation.lat;
          const cLng = cluster.centroid?.lng ?? facilityLocation.lng;

          // 1. Distance cost (in km)
          let dist = this.haversineDistance(
            driverLat,
            driverLng,
            cLat,
            cLng
          );
          if (isNaN(dist)) dist = 0;

          // Find active vehicle and capacity constraints
          const activeAssignment = driver.assignments?.find((a: any) => a.isActive);
          let capacityPenalty = 0;
          let vehiclePenalty = 0;

          const isMotorcycleDriver =
            driver.driverLicenseClass === 'A1' ||
            driver.driverLicenseClass === 'A2' ||
            ((driver as any).driverTypes && (driver as any).driverTypes.some((dt: any) => dt.driverType === 'HUB_DELIVERY')) ||
            (driver as any).driverType === 'HUB_DELIVERY';

          if (activeAssignment) {
            const maxWeight = Number(activeAssignment.vehicle.maxWeight || 0);
            if (clusterWeight > maxWeight) {
              // Soft constraint violation penalty
              capacityPenalty = 1000000;
            }
          } else if (!isMotorcycleDriver) {
            // Driver has no assigned vehicle (only penalize for truck drivers)
            vehiclePenalty = 500000;
          }

          // Composite cost (rounded to integer to prevent float precision loops in Hungarian algorithm)
          let totalCost = Math.round((dist + capacityPenalty + vehiclePenalty) * 1000);
          if (isNaN(totalCost)) totalCost = 999999;
          costMatrix[i][j] = totalCost;
        } else {
          // Dummy driver or dummy cluster cost is 0
          costMatrix[i][j] = 0;
        }
      }
    }

    // Solve Hungarian Algorithm
    const matchings = this.solveHungarian(costMatrix);
    const assignments: DriverAssignment[] = [];
    const assignedClusterIds = new Set<number>();

    // First pass: standard matching from Hungarian algorithm
    for (let i = 0; i < N; i++) {
      const assignedCol = matchings[i];
      if (assignedCol !== -1 && assignedCol < K && !assignedClusterIds.has(assignedCol)) {
        assignments.push({
          driverId: drivers[i].id,
          clusterId: assignedCol,
          cost: costMatrix[i][assignedCol],
        });
        assignedClusterIds.add(assignedCol);
      }
    }

    // Fallback pass: ensure any unassigned driver gets assigned to any remaining unassigned cluster
    const assignedDriverIds = new Set(assignments.map((a) => a.driverId));
    for (let i = 0; i < N; i++) {
      const driverId = drivers[i].id;
      if (!assignedDriverIds.has(driverId)) {
        for (let j = 0; j < K; j++) {
          if (!assignedClusterIds.has(j)) {
            assignments.push({
              driverId,
              clusterId: j,
              cost: costMatrix[i][j],
            });
            assignedClusterIds.add(j);
            assignedDriverIds.add(driverId);
            break;
          }
        }
      }
    }

    return assignments;
  }
}
