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
      const isPickup = order.status === 'READY_FOR_PICKUP';
      const lat = isPickup ? order.pickupLatitude : order.deliveryLatitude;
      const lng = isPickup ? order.pickupLongitude : order.deliveryLongitude;
      return { lat, lng };
    };

    const validOrders = orders.filter((order) => {
      const coords = getOrderCoords(order);
      return coords.lat !== null && coords.lng !== null && coords.lat !== undefined && coords.lng !== undefined;
    });

    if (validOrders.length === 0) return [];

    const targetK = Math.min(k, validOrders.length);
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
      if (clusterIdx !== -1) {
        clusters[clusterIdx].orders.push(validOrders[i]);
      }
    }

    return clusters;
  }
}
