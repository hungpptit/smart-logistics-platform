import { Order } from '@prisma/client';

export interface DBSCANCluster {
  id: number;
  centroid: { lat: number; lng: number };
  orders: Order[];
  isNoise?: boolean;
}

export interface DBSCANResult {
  clusters: DBSCANCluster[];
  noiseOrders: Order[];
}

export class DBSCANService {
  /**
   * Calculates the Haversine distance between two coordinates in kilometers.
   */
  public haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
   * Helper to extract order coordinates based on lifecycle status (Pickup vs Delivery)
   */
  public getOrderCoords(order: Order): { lat: number; lng: number } {
    const isPickup =
      order.status !== 'AT_HUB' &&
      order.status !== 'OUT_FOR_DELIVERY' &&
      order.status !== 'DELIVERED';
    const lat = isPickup ? order.pickupLatitude : order.deliveryLatitude;
    const lng = isPickup ? order.pickupLongitude : order.deliveryLongitude;
    return { lat: Number(lat || 0), lng: Number(lng || 0) };
  }

  /**
   * Runs DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
   * 
   * @param orders List of orders to cluster
   * @param epsilonRadiusKm Search radius in kilometers (default: 3.0 km)
   * @param minPts Minimum points to form a dense core cluster (default: 2)
   */
  public clusterOrdersDBSCAN(
    orders: Order[],
    epsilonRadiusKm: number = 3.0,
    minPts: number = 2
  ): DBSCANResult {
    if (!orders || orders.length === 0) {
      return { clusters: [], noiseOrders: [] };
    }

    // Filter valid coordinates
    const validOrders = orders.filter((o) => {
      const coords = this.getOrderCoords(o);
      return coords.lat !== 0 && coords.lng !== 0;
    });

    if (validOrders.length === 0) {
      return { clusters: [], noiseOrders: [] };
    }

    const n = validOrders.length;
    const visited = new Array<boolean>(n).fill(false);
    const clusterAssigned = new Array<number>(n).fill(-1); // -1: unassigned, -2: noise, >= 0: clusterId
    let clusterIdCounter = 0;
    const clusterMap = new Map<number, Order[]>();

    // Precompute distances
    const distMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      const c1 = this.getOrderCoords(validOrders[i]);
      for (let j = i + 1; j < n; j++) {
        const c2 = this.getOrderCoords(validOrders[j]);
        const d = this.haversineDistance(c1.lat, c1.lng, c2.lat, c2.lng);
        distMatrix[i][j] = d;
        distMatrix[j][i] = d;
      }
    }

    const getNeighbors = (pointIdx: number): number[] => {
      const neighbors: number[] = [];
      for (let j = 0; j < n; j++) {
        if (distMatrix[pointIdx][j] <= epsilonRadiusKm) {
          neighbors.push(j);
        }
      }
      return neighbors;
    };

    // Iterate through all points
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      visited[i] = true;

      const neighbors = getNeighbors(i);

      if (neighbors.length < minPts) {
        // Mark as noise temporarily
        clusterAssigned[i] = -2;
      } else {
        // Expand core cluster
        const currentClusterId = clusterIdCounter++;
        clusterAssigned[i] = currentClusterId;
        const currentClusterOrders: Order[] = [validOrders[i]];

        const queue: number[] = [...neighbors.filter((idx) => idx !== i)];

        while (queue.length > 0) {
          const currentPoint = queue.shift()!;

          if (!visited[currentPoint]) {
            visited[currentPoint] = true;
            const currentNeighbors = getNeighbors(currentPoint);
            if (currentNeighbors.length >= minPts) {
              for (const neighborIdx of currentNeighbors) {
                if (!queue.includes(neighborIdx) && clusterAssigned[neighborIdx] !== currentClusterId) {
                  queue.push(neighborIdx);
                }
              }
            }
          }

          if (clusterAssigned[currentPoint] < 0) {
            // Assign noise or unassigned point to this cluster
            clusterAssigned[currentPoint] = currentClusterId;
            currentClusterOrders.push(validOrders[currentPoint]);
          }
        }

        clusterMap.set(currentClusterId, currentClusterOrders);
      }
    }

    // Identify noise orders
    const noiseOrders: Order[] = [];
    for (let i = 0; i < n; i++) {
      if (clusterAssigned[i] === -2) {
        noiseOrders.push(validOrders[i]);
      }
    }

    // Build cluster result list with calculated centroids
    const resultClusters: DBSCANCluster[] = [];
    clusterMap.forEach((cOrders, cId) => {
      let sumLat = 0;
      let sumLng = 0;
      for (const ord of cOrders) {
        const coords = this.getOrderCoords(ord);
        sumLat += coords.lat;
        sumLng += coords.lng;
      }
      resultClusters.push({
        id: cId,
        centroid: {
          lat: sumLat / cOrders.length,
          lng: sumLng / cOrders.length,
        },
        orders: cOrders,
        isNoise: false,
      });
    });

    console.log(`🗺️ [DBSCAN] Clustered ${n} orders into ${resultClusters.length} dense regions with ${noiseOrders.length} outlier noise points.`);

    return {
      clusters: resultClusters,
      noiseOrders,
    };
  }
}
