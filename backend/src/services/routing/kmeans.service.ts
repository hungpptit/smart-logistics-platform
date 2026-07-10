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

    // Filter orders that have valid delivery coordinates
    const validOrders = orders.filter(
      (order) => order.deliveryLatitude !== null && order.deliveryLongitude !== null
    );

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
        centroids.push({
          lat: validOrders[randIdx].deliveryLatitude!,
          lng: validOrders[randIdx].deliveryLongitude!,
        });
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
        let minDistance = Infinity;
        let bestCluster = -1;

        for (let j = 0; j < centroids.length; j++) {
          const dist = this.haversineDistance(
            order.deliveryLatitude!,
            order.deliveryLongitude!,
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
        const order = validOrders[i];
        if (clusterId !== -1) {
          newCentroids[clusterId].lat += order.deliveryLatitude!;
          newCentroids[clusterId].lng += order.deliveryLongitude!;
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
