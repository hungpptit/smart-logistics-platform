import { Order } from '@prisma/client';
import { DBSCANService, DBSCANResult } from './dbscan.service';

export interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  orders: Order[];
  totalWeightKg?: number;
  totalVolumeM3?: number;
}

export class KMeansService {
  private dbscanService = new DBSCANService();

  /**
   * Calculates the Haversine distance between two coordinates in kilometers.
   */
  public haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.dbscanService.haversineDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Helper to extract order coordinates based on lifecycle status (Pickup vs Delivery)
   */
  private getOrderCoords(order: Order): { lat: number; lng: number } {
    return this.dbscanService.getOrderCoords(order);
  }

  /**
   * Primary Entrypoint for Module 1: Hybrid DBSCAN + Capacity-Constrained K-Means Clustering.
   * 
   * Pipeline:
   * 1. DBSCAN: Discovers natural geographic density clusters & isolates outlier noise points.
   * 2. Capacity-Constrained K-Means: Subdivides dense regions based on vehicle capacity (Weight & Volume).
   * 3. Noise Reconciliation: Merges isolated outliers into the geographically closest cluster with spare capacity.
   */
  public clusterOrders(orders: Order[], k: number): Cluster[] {
    if (!orders || orders.length === 0) return [];
    if (k <= 0) return [];

    // Filter valid orders
    const validOrders = orders.filter((order) => {
      const coords = this.getOrderCoords(order);
      return coords.lat !== 0 && coords.lng !== 0;
    });

    if (validOrders.length === 0) return [];

    // Step 1: Run DBSCAN (Default epsilon = 3.0 km, minPts = 2)
    const dbscanResult: DBSCANResult = this.dbscanService.clusterOrdersDBSCAN(validOrders, 3.0, 2);

    // If DBSCAN found clusters, build upon them; otherwise fallback to direct K-Means
    if (dbscanResult.clusters.length > 0) {
      return this.refineDBSCANWithKMeans(dbscanResult, validOrders, k);
    } else {
      return this.runCapacityKMeans(validOrders, k);
    }
  }

  /**
   * Refines DBSCAN clusters with K-Means and handles noise points.
   */
  private refineDBSCANWithKMeans(
    dbscanResult: DBSCANResult,
    allValidOrders: Order[],
    maxK: number
  ): Cluster[] {
    const rawClusters = dbscanResult.clusters;
    const noiseOrders = dbscanResult.noiseOrders;

    const MAX_WEIGHT_PER_DRIVER = 50.0; // kg
    const MAX_VOLUME_PER_DRIVER = 0.20; // m3 (~200 liters)
    const MAX_ORDERS_PER_DRIVER = 25;

    let finalClusters: Cluster[] = [];
    let currentId = 0;

    const totalOrders = allValidOrders.length;
    const targetClusterCount = Math.min(maxK, totalOrders);

    // Process each DBSCAN cluster
    for (const dCluster of rawClusters) {
      const cOrders = dCluster.orders;
      const { weight, volume } = this.calculateClusterLoad(cOrders);

      const capacityK = Math.max(
        1,
        Math.ceil(weight / MAX_WEIGHT_PER_DRIVER),
        Math.ceil(volume / MAX_VOLUME_PER_DRIVER),
        Math.ceil(cOrders.length / MAX_ORDERS_PER_DRIVER)
      );

      // Desired split based on proportion of total orders vs targetClusterCount
      const propK = Math.max(1, Math.round((cOrders.length / totalOrders) * targetClusterCount));
      const neededK = Math.min(cOrders.length, Math.max(capacityK, propK));

      if (neededK > 1 && cOrders.length >= neededK) {
        // Subdivide large DBSCAN cluster using K-Means
        const subClusters = this.runCapacityKMeans(cOrders, neededK);
        for (const sub of subClusters) {
          finalClusters.push({
            id: currentId++,
            centroid: sub.centroid,
            orders: sub.orders,
            totalWeightKg: sub.totalWeightKg,
            totalVolumeM3: sub.totalVolumeM3,
          });
        }
      } else {
        finalClusters.push({
          id: currentId++,
          centroid: dCluster.centroid,
          orders: cOrders,
          totalWeightKg: weight,
          totalVolumeM3: volume,
        });
      }
    }

    // Step 3: Reconcile Noise Orders by assigning them to the nearest centroid
    if (noiseOrders.length > 0) {
      if (finalClusters.length === 0) {
        // If everything was noise, run standard K-Means directly
        return this.runCapacityKMeans(noiseOrders, Math.min(maxK, Math.max(1, Math.ceil(noiseOrders.length / MAX_ORDERS_PER_DRIVER))));
      }

      for (const nOrd of noiseOrders) {
        const nCoords = this.getOrderCoords(nOrd);
        let minDistance = Infinity;
        let bestClusterIdx = 0;

        for (let i = 0; i < finalClusters.length; i++) {
          const dist = this.haversineDistance(
            nCoords.lat,
            nCoords.lng,
            finalClusters[i].centroid.lat,
            finalClusters[i].centroid.lng
          );
          if (dist < minDistance) {
            minDistance = dist;
            bestClusterIdx = i;
          }
        }

        // Attach noise order to the closest cluster
        finalClusters[bestClusterIdx].orders.push(nOrd);
      }

      // Recalculate centroids and loads for all clusters
      finalClusters = finalClusters.map((c) => {
        const load = this.calculateClusterLoad(c.orders);
        let sumLat = 0;
        let sumLng = 0;
        for (const o of c.orders) {
          const coords = this.getOrderCoords(o);
          sumLat += coords.lat;
          sumLng += coords.lng;
        }
        return {
          ...c,
          centroid: {
            lat: sumLat / c.orders.length,
            lng: sumLng / c.orders.length,
          },
          totalWeightKg: load.weight,
          totalVolumeM3: load.volume,
        };
      });
    }

    // If resulting clusters exceed available drivers maxK, merge closest clusters
    while (finalClusters.length > maxK && finalClusters.length > 1) {
      let minPairDist = Infinity;
      let mergeI = 0;
      let mergeJ = 1;

      for (let i = 0; i < finalClusters.length; i++) {
        for (let j = i + 1; j < finalClusters.length; j++) {
          const d = this.haversineDistance(
            finalClusters[i].centroid.lat,
            finalClusters[i].centroid.lng,
            finalClusters[j].centroid.lat,
            finalClusters[j].centroid.lng
          );
          if (d < minPairDist) {
            minPairDist = d;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Merge cluster J into cluster I
      const mergedOrders = [...finalClusters[mergeI].orders, ...finalClusters[mergeJ].orders];
      const mergedLoad = this.calculateClusterLoad(mergedOrders);
      let sLat = 0;
      let sLng = 0;
      for (const o of mergedOrders) {
        const c = this.getOrderCoords(o);
        sLat += c.lat;
        sLng += c.lng;
      }

      finalClusters[mergeI] = {
        id: finalClusters[mergeI].id,
        centroid: { lat: sLat / mergedOrders.length, lng: sLng / mergedOrders.length },
        orders: mergedOrders,
        totalWeightKg: mergedLoad.weight,
        totalVolumeM3: mergedLoad.volume,
      };

      finalClusters.splice(mergeJ, 1);
    }

    console.log(`🗺️ [Hybrid DBSCAN+KMeans] Output ${finalClusters.length} optimal clusters (max requested: ${maxK}).`);
    return finalClusters;
  }

  /**
   * Capacity-Constrained K-Means algorithm implementation.
   */
  private runCapacityKMeans(validOrders: Order[], k: number): Cluster[] {
    const targetK = Math.max(1, Math.min(k, validOrders.length));

    // Initialize centroids by choosing targetK unique orders
    const centroids: { lat: number; lng: number }[] = [];
    const usedIndices = new Set<number>();

    while (centroids.length < targetK && centroids.length < validOrders.length) {
      const randIdx = Math.floor(Math.random() * validOrders.length);
      if (!usedIndices.has(randIdx)) {
        usedIndices.add(randIdx);
        const c = this.getOrderCoords(validOrders[randIdx]);
        centroids.push({ lat: c.lat, lng: c.lng });
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
        const coords = this.getOrderCoords(order);
        let minDistance = Infinity;
        let bestCluster = -1;

        for (let j = 0; j < centroids.length; j++) {
          const dist = this.haversineDistance(
            coords.lat,
            coords.lng,
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
      for (let j = 0; j < centroids.length; j++) {
        const clusterOrders = validOrders.filter((_, idx) => assignments[idx] === j);
        if (clusterOrders.length > 0) {
          const sumLat = clusterOrders.reduce((sum, o) => sum + this.getOrderCoords(o).lat, 0);
          const sumLng = clusterOrders.reduce((sum, o) => sum + this.getOrderCoords(o).lng, 0);
          centroids[j] = {
            lat: sumLat / clusterOrders.length,
            lng: sumLng / clusterOrders.length,
          };
        }
      }
    }

    // Build raw clusters
    const clusters: Cluster[] = centroids.map((c, idx) => {
      const cOrders = validOrders.filter((_, orderIdx) => assignments[orderIdx] === idx);
      const load = this.calculateClusterLoad(cOrders);
      return {
        id: idx,
        centroid: c,
        orders: cOrders,
        totalWeightKg: load.weight,
        totalVolumeM3: load.volume,
      };
    }).filter(c => c.orders.length > 0);

    return clusters;
  }

  /**
   * Helper to sum package weight and volume for a given order list
   */
  private calculateClusterLoad(orders: Order[]): { weight: number; volume: number } {
    let totalWeight = 0;
    let totalVolume = 0;

    for (const o of orders) {
      const pkg = (o as any).package;
      const pkgs = (o as any).packages;
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

      totalWeight += (w > 0 ? w : 1.0);
      totalVolume += (v > 0 ? v : 0.004);
    }

    return { weight: totalWeight, volume: totalVolume };
  }
}
