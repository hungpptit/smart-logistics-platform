import { Order } from '@prisma/client';

export interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  orders: Order[];
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
  public clusterOrders(orders: Order[], k: number): Cluster[] {
    if (orders.length === 0) return [];
    if (k <= 0) return [];

    // Extract correct coordinates based on order status (Pickup vs Delivery)
    const getOrderCoords = (order: Order) => {
      const isPickup = order.status === 'READY_FOR_PICKUP';
      const lat = isPickup ? order.pickupLatitude : order.deliveryLatitude;
      const lng = isPickup ? order.pickupLongitude : order.deliveryLongitude;
      return { lat, lng };
    };

    // Filter orders that have valid coordinates
    const validOrders = orders.filter((order) => {
      const coords = getOrderCoords(order);
      return coords.lat !== null && coords.lng !== null && coords.lat !== undefined && coords.lng !== undefined;
    });

    if (validOrders.length === 0) return [];

    // If K is greater than or equal to the number of valid orders, place each order in its own cluster
    const targetK = Math.min(k, validOrders.length);

    // Initialize centroids by choosing targetK unique orders
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

      // Assign each order to the nearest centroid
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

      // Recompute centroids
      const newCentroids = Array.from({ length: targetK }, () => ({
        lat: 0,
        lng: 0,
        count: 0,
      }));

      for (let i = 0; i < validOrders.length; i++) {
        const clusterId = assignments[i];
        const coords = getOrderCoords(validOrders[i]);
        if (clusterId !== -1) {
          newCentroids[clusterId].lat += coords.lat!;
          newCentroids[clusterId].lng += coords.lng!;
          newCentroids[clusterId].count++;
        }
      }

      for (let j = 0; j < centroids.length; j++) {
        if (newCentroids[j].count > 0) {
          const newLat = newCentroids[j].lat / newCentroids[j].count;
          const newLng = newCentroids[j].lng / newCentroids[j].count;
          
          // Check if centroid moved
          if (centroids[j].lat !== newLat || centroids[j].lng !== newLng) {
            centroids[j] = { lat: newLat, lng: newLng };
          }
        }
      }
    }

    // Build cluster objects
    const clusters: Cluster[] = Array.from({ length: targetK }, (_, idx) => ({
      id: idx,
      centroid: centroids[idx],
      orders: [],
    }));

    for (let i = 0; i < validOrders.length; i++) {
      const clusterId = assignments[i];
      if (clusterId !== -1) {
        clusters[clusterId].orders.push(validOrders[i]);
      }
    }

    return clusters;
  }
}
