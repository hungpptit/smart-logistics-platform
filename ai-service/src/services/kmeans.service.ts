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
    weightKg?: number;
    volume?: number | string;
    volumeM3?: number;
    length?: number | string;
    lengthCm?: number;
    width?: number | string;
    widthCm?: number;
    height?: number | string;
    heightCm?: number;
  };
  packages?: Array<{
    weight?: number | string;
    weightKg?: number;
    volume?: number | string;
    volumeM3?: number;
    length?: number | string;
    lengthCm?: number;
    width?: number | string;
    widthCm?: number;
    height?: number | string;
    heightCm?: number;
  }>;
}

export interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  orders: OrderItem[];
}

export interface KMeansOptions {
  maxOrdersPerCluster?: number;
  maxWeightKg?: number;
  maxVolumeM3?: number;
  restarts?: number;
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
   * Multi-start (restarts=5) để loại bỏ phương sai khởi tạo ngẫu nhiên,
   * gỡ bỏ cưỡng ép số đơn phẳng (Math.ceil(N/K)) và áp dụng trần tải đa chiều thực tế (25 đơn, 50kg, 0.20m3).
   */
  public clusterOrders(orders: OrderItem[], k: number, options?: KMeansOptions): Cluster[] {
    if (orders.length === 0) return [];
    if (k <= 0) return [];

    // Extract correct coordinates based on order status (Pickup vs Delivery)
    const getOrderCoords = (order: OrderItem) => {
      const isPickup = order.status !== 'AT_HUB' && order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED';
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

    // Count unique physical location coordinates
    const uniqueLocKeys = new Set<string>();
    for (const o of validOrders) {
      const coords = getOrderCoords(o);
      if (coords.lat != null && coords.lng != null) {
        uniqueLocKeys.add(`${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`);
      }
    }

    // 1. Calculate physical capacity demands
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;

    for (const o of validOrders) {
      const pkg = o.package;
      const pkgs = o.packages;
      let w = 0;
      let v = 0;

      if (pkg) {
        w = Number(pkg.weightKg || pkg.weight) || 0;
        const width = Number(pkg.widthCm || pkg.width || 20) / 100;
        const height = Number(pkg.heightCm || pkg.height || 20) / 100;
        const length = Number(pkg.lengthCm || pkg.length || 20) / 100;
        v = Number(pkg.volumeM3 || pkg.volume) || width * height * length;
      } else if (pkgs && pkgs.length > 0) {
        for (const p of pkgs) {
          w += Number(p.weightKg || p.weight) || 0;
          v += Number(p.volumeM3 || p.volume) || 0.004;
        }
      }

      totalWeightKg += w > 0 ? w : 1.0;
      totalVolumeM3 += v > 0 ? v : 0.008;
    }

    // Standard Motorcycle Capacity Limits:
    const MAX_ORDERS_PER_DRIVER = options?.maxOrdersPerCluster ?? 25;
    const MAX_WEIGHT_PER_DRIVER = options?.maxWeightKg ?? 50.0;
    const MAX_VOLUME_PER_DRIVER = options?.maxVolumeM3 ?? 0.20;

    const weightK = Math.ceil(totalWeightKg / MAX_WEIGHT_PER_DRIVER);
    const volumeK = Math.ceil(totalVolumeM3 / MAX_VOLUME_PER_DRIVER);
    const countK = Math.ceil(validOrders.length / MAX_ORDERS_PER_DRIVER);

    const capacityK = Math.max(1, weightK, volumeK, countK);

    // 2. Spatial spread
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

    let spatialK = 1;
    if (maxDistanceKm > 1.0) {
      spatialK = Math.min(k, uniqueLocKeys.size);
    }

    const idealK = Math.max(capacityK, spatialK);
    const targetK = Math.max(1, Math.min(k, idealK));

    // Multi-start K-Means: Chạy nhiều lần ngẫu nhiên và chọn nghiệm có Inertia nhỏ nhất
    const parsedRestarts = Math.floor(Number(process.env.KMEANS_RESTARTS));
    const restarts = options?.restarts ?? (Number.isFinite(parsedRestarts) && parsedRestarts >= 1 ? parsedRestarts : 5);

    let bestInertia = Infinity;
    let bestCentroids: { lat: number; lng: number }[] = [];
    let bestAssignments: number[] = [];

    for (let r = 0; r < restarts; r++) {
      // Khởi tạo tâm
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
      const maxIterations = 60;
      let assignments = new Array(validOrders.length).fill(-1);
      let changed = true;

      while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        for (let i = 0; i < validOrders.length; i++) {
          const coords = getOrderCoords(validOrders[i]);
          let minDist = Infinity;
          let closest = 0;

          for (let j = 0; j < targetK; j++) {
            const dist = this.haversineDistance(coords.lat!, coords.lng!, centroids[j].lat, centroids[j].lng);
            if (dist < minDist) {
              minDist = dist;
              closest = j;
            }
          }

          if (assignments[i] !== closest) {
            assignments[i] = closest;
            changed = true;
          }
        }

        const newCentroids = Array.from({ length: targetK }, () => ({ latSum: 0, lngSum: 0, count: 0 }));
        for (let i = 0; i < validOrders.length; i++) {
          const clusterId = assignments[i];
          const coords = getOrderCoords(validOrders[i]);
          newCentroids[clusterId].latSum += coords.lat!;
          newCentroids[clusterId].lngSum += coords.lng!;
          newCentroids[clusterId].count++;
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

      let currentInertia = 0;
      for (let i = 0; i < validOrders.length; i++) {
        const cId = assignments[i];
        const coords = getOrderCoords(validOrders[i]);
        const d = this.haversineDistance(coords.lat!, coords.lng!, centroids[cId].lat, centroids[cId].lng);
        currentInertia += d * d;
      }

      if (currentInertia < bestInertia) {
        bestInertia = currentInertia;
        bestCentroids = centroids.map((c) => ({ ...c }));
        bestAssignments = [...assignments];
      }
    }

    const clusters: Cluster[] = Array.from({ length: targetK }, (_, idx) => ({
      id: idx + 1,
      centroid: bestCentroids[idx],
      orders: [],
    }));

    for (let i = 0; i < validOrders.length; i++) {
      const cId = bestAssignments[i];
      if (cId !== -1 && cId < targetK) {
        clusters[cId].orders.push(validOrders[i]);
      }
    }

    // Đảm bảo không cụm nào bị rỗng
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

    // Xử lý tràn tải thực tế đa chiều (Chỉ can thiệp khi vượt trần 25 đơn, 50kg, 0.20m3)
    const getOrderDemand = (o: OrderItem) => {
      const pkg = o.package;
      let w = 1.0;
      let v = 0.008;
      if (pkg) {
        w = Number(pkg.weightKg || pkg.weight) || 1.0;
        const width = Number(pkg.widthCm || pkg.width || 20) / 100;
        const height = Number(pkg.heightCm || pkg.height || 20) / 100;
        const length = Number(pkg.lengthCm || pkg.length || 20) / 100;
        v = Number(pkg.volumeM3 || pkg.volume) || width * height * length;
      }
      return { w, v };
    };

    for (let iter = 0; iter < 10; iter++) {
      let overCapacityFound = false;

      for (let c = 0; c < targetK; c++) {
        const clusterOrders = clusters[c].orders;
        let cWeight = clusterOrders.reduce((sum, o) => sum + getOrderDemand(o).w, 0);
        let cVolume = clusterOrders.reduce((sum, o) => sum + getOrderDemand(o).v, 0);

        while (
          clusterOrders.length > MAX_ORDERS_PER_DRIVER ||
          cWeight > MAX_WEIGHT_PER_DRIVER ||
          cVolume > MAX_VOLUME_PER_DRIVER
        ) {
          overCapacityFound = true;

          let maxDist = -1;
          let furthestIdx = -1;
          for (let i = 0; i < clusterOrders.length; i++) {
            const coords = getOrderCoords(clusterOrders[i]);
            const dist = this.haversineDistance(coords.lat!, coords.lng!, clusters[c].centroid.lat, clusters[c].centroid.lng);
            if (dist > maxDist) {
              maxDist = dist;
              furthestIdx = i;
            }
          }

          if (furthestIdx === -1) break;

          const ordToMove = clusterOrders[furthestIdx];
          const ordDemand = getOrderDemand(ordToMove);
          const coords = getOrderCoords(ordToMove);

          let bestOther = -1;
          let minOtherDist = Infinity;

          for (let other = 0; other < targetK; other++) {
            if (other === c) continue;
            const otherOrders = clusters[other].orders;
            const otherWeight = otherOrders.reduce((sum, o) => sum + getOrderDemand(o).w, 0);
            const otherVolume = otherOrders.reduce((sum, o) => sum + getOrderDemand(o).v, 0);

            if (
              otherOrders.length + 1 <= MAX_ORDERS_PER_DRIVER &&
              otherWeight + ordDemand.w <= MAX_WEIGHT_PER_DRIVER &&
              otherVolume + ordDemand.v <= MAX_VOLUME_PER_DRIVER
            ) {
              const dist = this.haversineDistance(coords.lat!, coords.lng!, clusters[other].centroid.lat, clusters[other].centroid.lng);
              if (dist < minOtherDist) {
                minOtherDist = dist;
                bestOther = other;
              }
            }
          }

          if (bestOther !== -1) {
            const [moved] = clusterOrders.splice(furthestIdx, 1);
            clusters[bestOther].orders.push(moved);
            cWeight -= ordDemand.w;
            cVolume -= ordDemand.v;
          } else {
            break;
          }
        }
      }

      if (!overCapacityFound) break;
    }

    return clusters;
  }
}
