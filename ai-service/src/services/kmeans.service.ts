export interface Location {
  lat: number;
  lng: number;
}

export interface OrderItem {
  id: string;
  orderCode: string;
  status: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  estimatedDeliveryDate?: string | Date | null;
  packageWeightKg?: number;
  package?: {
    weight?: number | string;
    volume?: number | string;
    length?: number | string;
    width?: number | string;
    height?: number | string;
  };
  packages?: Array<{
    weight?: number | string;
    volume?: number | string;
    length?: number | string;
    width?: number | string;
    height?: number | string;
  }>;
}

export interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  orders: OrderItem[];
}

export class KMeansService {
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
   * Group orders into K clusters using K-Means algorithm.
   */
  public clusterOrders(orders: OrderItem[], k: number): Cluster[] {
    if (orders.length === 0) return [];
    if (k <= 0) return [];

    const getOrderCoords = (order: OrderItem) => {
      const isPickup = order.status !== 'AT_HUB' && order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED';
      const lat = isPickup ? order.pickupLatitude : order.deliveryLatitude;
      const lng = isPickup ? order.pickupLongitude : order.deliveryLongitude;
      return { lat, lng };
    };

    const validOrders = orders.filter((order) => {
      const coords = getOrderCoords(order);
      return coords.lat !== null && coords.lng !== null && coords.lat !== undefined && coords.lng !== undefined;
    });

    if (validOrders.length === 0) return [];

    // Count unique physical location coordinates
    const uniqueLocKeys = new Set<string>();
    for (const o of validOrders) {
      const coords = getOrderCoords(o);
      if (coords.lat != null && coords.lng != null) {
        uniqueLocKeys.add(`${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`);
      }
    }

    // 1. Calculate physical capacity demands (Weight, Volume m3, Order Count)
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;

    for (const o of validOrders) {
      const pkg = o.package;
      const pkgs = o.packages;
      let w = 0;
      let v = 0;

      if (pkg) {
        w = Number(pkg.weight) || 0;
        v = Number(pkg.volume) || 0;
      } else if (pkgs && pkgs.length > 0) {
        for (const p of pkgs) {
          w += Number(p.weight) || 0;
          v += Number(p.volume) || 0;
        }
      }

      totalWeightKg += (w > 0 ? w : 1.0);
      totalVolumeM3 += (v > 0 ? v : 0.004);
    }

    // Standard Motorcycle Shipper Bag/Box Constraints:
    // Max 50 kg weight, Max 0.20 m3 volume (~200 Liters sọt hàng), Max 25 orders per driver
    const MAX_WEIGHT_PER_DRIVER = 50.0;
    const MAX_VOLUME_PER_DRIVER = 0.20;
    const MAX_ORDERS_PER_DRIVER = 25;

    const weightK = Math.ceil(totalWeightKg / MAX_WEIGHT_PER_DRIVER);
    const volumeK = Math.ceil(totalVolumeM3 / MAX_VOLUME_PER_DRIVER);
    const countK = Math.ceil(validOrders.length / MAX_ORDERS_PER_DRIVER);

    const capacityK = Math.max(1, weightK, volumeK, countK);

    // 2. Calculate spatial spread (max distance between any two orders in km)
    let maxDistanceKm = 0;
    for (let i = 0; i < validOrders.length; i++) {
      const c1 = getOrderCoords(validOrders[i]);
      for (let j = i + 1; j < validOrders.length; j++) {
        const c2 = getOrderCoords(validOrders[j]);
        if (c1.lat != null && c1.lng != null && c2.lat != null && c2.lng != null) {
          const d = this.haversineDistance(c1.lat, c1.lng, c2.lat, c2.lng);
          if (d > maxDistanceKm) maxDistanceKm = d;
        }
      }
    }

    // Determine spatial clusters: if all orders are within 1.0 km radius (same street/neighborhood), 1 driver is sufficient
    let spatialK = 1;
    if (maxDistanceKm > 1.0) {
      spatialK = Math.min(k, uniqueLocKeys.size);
    }

    // Ideal number of drivers is max of capacity demand and spatial cluster demand
    const idealK = Math.max(capacityK, spatialK);
    const targetK = Math.max(1, Math.min(k, idealK));
    const centroids: { lat: number; lng: number }[] = [];
    const usedIndices = new Set<number>();
    
    while (centroids.length < targetK) {
      const randIdx = Math.floor(Math.random() * validOrders.length);
      if (!usedIndices.has(randIdx)) {
        usedIndices.add(randIdx);
        const c = getOrderCoords(validOrders[randIdx]);
        centroids.push({ lat: c.lat!, lng: c.lng! });
      }
    }

    let iterations = 0;
    const maxIterations = 100;
    let assignments = new Array(validOrders.length).fill(-1);
    let changed = true;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (let i = 0; i < validOrders.length; i++) {
        const order = validOrders[i];
        const coords = getOrderCoords(order);
        let minDistance = Infinity;
        let bestCluster = -1;

        for (let j = 0; j < centroids.length; j++) {
          const dist = this.haversineDistance(
            coords.lat!,
            coords.lng!,
            centroids[j].lat,
            centroids[j].lng
          );
          if (dist < minDistance) {
            minDistance = dist;
            bestCluster = j;
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      const newCentroids = Array.from({ length: targetK }, () => ({
        latSum: 0,
        lngSum: 0,
        count: 0,
      }));

      for (let i = 0; i < validOrders.length; i++) {
        const clusterIdx = assignments[i];
        if (clusterIdx !== -1) {
          const coords = getOrderCoords(validOrders[i]);
          newCentroids[clusterIdx].latSum += coords.lat!;
          newCentroids[clusterIdx].lngSum += coords.lng!;
          newCentroids[clusterIdx].count++;
        }
      }

      for (let j = 0; j < targetK; j++) {
        if (newCentroids[j].count > 0) {
          centroids[j] = {
            lat: newCentroids[j].latSum / newCentroids[j].count,
            lng: newCentroids[j].lngSum / newCentroids[j].count,
          };
        }
      }
    }

    const clusters: Cluster[] = Array.from({ length: targetK }, (_, idx) => {
      const c = centroids[idx] || { lat: 10.7769, lng: 106.7009 };
      const safeLat = isNaN(c?.lat) ? 10.7769 : c.lat;
      const safeLng = isNaN(c?.lng) ? 106.7009 : c.lng;
      return {
        id: idx + 1,
        centroid: { lat: safeLat, lng: safeLng },
        orders: [],
      };
    });

    for (let i = 0; i < validOrders.length; i++) {
      const clusterIdx = assignments[i];
      if (clusterIdx !== -1 && clusterIdx < targetK) {
        clusters[clusterIdx].orders.push(validOrders[i]);
      }
    }

    // Ensure no cluster is left empty
    for (let c = 0; c < targetK; c++) {
      if (clusters[c].orders.length === 0) {
        let largest = clusters[0];
        for (const cl of clusters) {
          if (cl.orders.length > largest.orders.length) {
            largest = cl;
          }
        }
        if (largest && largest.orders.length > 1) {
          const movedOrder = largest.orders.pop()!;
          clusters[c].orders.push(movedOrder);
        }
      }
    }

    // Workload Balancing: Fairly balance orders among drivers
    if (targetK > 1 && validOrders.length > targetK) {
      const maxCapacity = Math.ceil(validOrders.length / targetK);
      for (let iter = 0; iter < 10; iter++) {
        let rebalanced = false;
        for (let c = 0; c < targetK; c++) {
          while (clusters[c].orders.length > maxCapacity) {
            let maxDist = -1;
            let furthestIdx = -1;
            for (let i = 0; i < clusters[c].orders.length; i++) {
              const ord = clusters[c].orders[i];
              const coords = getOrderCoords(ord);
              const dist = this.haversineDistance(coords.lat!, coords.lng!, clusters[c].centroid.lat, clusters[c].centroid.lng);
              if (dist > maxDist) {
                maxDist = dist;
                furthestIdx = i;
              }
            }

            if (furthestIdx === -1) break;

            let bestOther = -1;
            let minOtherDist = Infinity;
            const ordToMove = clusters[c].orders[furthestIdx];
            const coords = getOrderCoords(ordToMove);

            for (let o = 0; o < targetK; o++) {
              if (o !== c && clusters[o].orders.length < maxCapacity) {
                const dist = this.haversineDistance(coords.lat!, coords.lng!, clusters[o].centroid.lat, clusters[o].centroid.lng);
                if (dist < minOtherDist) {
                  minOtherDist = dist;
                  bestOther = o;
                }
              }
            }

            if (bestOther !== -1) {
              const [moved] = clusters[c].orders.splice(furthestIdx, 1);
              clusters[bestOther].orders.push(moved);
              rebalanced = true;
            } else {
              break;
            }
          }
        }
        if (!rebalanced) break;
      }
    }

    return clusters;
  }
}
