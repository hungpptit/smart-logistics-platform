import { Driver, DriverLocation, DriverVehicleAssignment, Vehicle, Order } from '@prisma/client';
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
    const u = new Array(n).fill(0);
    const v = new Array(n).fill(0);
    const p = new Array(n + 1).fill(0);
    const way = new Array(n + 1).fill(0);

    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Array(n + 1).fill(Infinity);
      const used = new Array(n + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Infinity;
        let j1 = 0;
        for (let j = 1; j <= n; j++) {
          if (!used[j]) {
            const cur = matrix[i0 - 1][j - 1] - u[i0] - v[j];
            if (cur < minv[j]) {
              minv[j] = cur;
              way[j] = j0;
            }
            if (minv[j] < delta) {
              delta = minv[j];
              j1 = j;
            }
          }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) {
            u[p[j]] += delta;
            v[j] -= delta;
          } else {
            minv[j] -= delta;
          }
        }
        j0 = j1;
      } while (p[j0] !== 0);

      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    const result = new Array(n).fill(-1);
    for (let j = 1; j <= n; j++) {
      if (p[j] > 0) {
        result[p[j] - 1] = j - 1;
      }
    }
    return result;
  }

  /**
   * Matches drivers to clusters using the Hungarian algorithm based on a composite cost matrix.
   */
  public async assignDriversToClusters(
    drivers: (Driver & {
      location?: DriverLocation | null;
      assignments?: (DriverVehicleAssignment & { vehicle: Vehicle })[];
    })[],
    clusters: Cluster[],
    facilityLocation: { lat: number; lng: number }
  ): Promise<DriverAssignment[]> {
    const N = drivers.length;
    const K = clusters.length;

    if (N === 0 || K === 0) return [];

    // Calculate total weights for each cluster
    const clusterWeights = await Promise.all(
      clusters.map(async (cluster) => {
        let totalWeight = 0;
        for (const order of cluster.orders) {
          const packages = await prisma.package.findMany({
            where: { orderId: order.id },
            select: { weight: true },
          });
          for (const pkg of packages) {
            totalWeight += Number(pkg.weight || 0);
          }
        }
        return totalWeight;
      })
    );

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

          // Check if driver has recent GPS coordinate
          if (driver.location) {
            const timeDiffMin = (Date.now() - new Date(driver.location.recordedAt).getTime()) / 60000;
            if (timeDiffMin < 30) {
              driverLat = driver.location.latitude;
              driverLng = driver.location.longitude;
            } else if (driver.preferredLatitude !== null && driver.preferredLongitude !== null) {
              driverLat = driver.preferredLatitude;
              driverLng = driver.preferredLongitude;
            }
          } else if (driver.preferredLatitude !== null && driver.preferredLongitude !== null) {
            driverLat = driver.preferredLatitude;
            driverLng = driver.preferredLongitude;
          }

          // 1. Distance cost (in km)
          const dist = this.haversineDistance(
            driverLat,
            driverLng,
            cluster.centroid.lat,
            cluster.centroid.lng
          );

          // Find active vehicle and capacity constraints
          const activeAssignment = driver.assignments?.find((a) => a.isActive);
          let capacityPenalty = 0;
          let vehiclePenalty = 0;

          if (activeAssignment) {
            const maxWeight = Number(activeAssignment.vehicle.maxWeight || 0);
            if (clusterWeight > maxWeight) {
              // Soft constraint violation penalty
              capacityPenalty = 1000000;
            }
          } else {
            // Driver has no assigned vehicle
            vehiclePenalty = 500000;
          }

          // Composite cost
          costMatrix[i][j] = dist + capacityPenalty + vehiclePenalty;
        } else {
          // Dummy driver or dummy cluster cost is 0
          costMatrix[i][j] = 0;
        }
      }
    }

    // Solve Hungarian Algorithm
    const matchings = this.solveHungarian(costMatrix);
    const assignments: DriverAssignment[] = [];

    for (let i = 0; i < N; i++) {
      const assignedCol = matchings[i];
      if (assignedCol !== -1 && assignedCol < K) {
        assignments.push({
          driverId: drivers[i].id,
          clusterId: assignedCol,
          cost: costMatrix[i][assignedCol],
        });
      }
    }

    return assignments;
  }
}
