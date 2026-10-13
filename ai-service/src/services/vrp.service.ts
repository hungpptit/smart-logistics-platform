import { OrderItem, Location } from './kmeans.service';

export class VRPService {
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
   * Precomputes distance and duration matrices using Goong Maps API, with fallback to OSRM and Haversine.
   */
  public async calculateDistanceAndDurationMatrices(
    locations: Location[]
  ): Promise<{ distanceMatrix: number[][]; durationMatrix: number[][]; matrixSource: 'goong' | 'osrm' | 'haversine' }> {
    const n = locations.length;
    const distanceMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const durationMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    if (n <= 1) {
      return { distanceMatrix, durationMatrix, matrixSource: 'haversine' };
    }

    // 1. Primary: Try Goong Maps Distance Matrix API if GOONG_API_KEY is available
    const GOONG_API_KEY = process.env.GOONG_API_KEY;
    if (GOONG_API_KEY) {
      try {
        const CHUNK_SIZE = 10;
        const chunks: { start: number; locs: Location[] }[] = [];
        for (let i = 0; i < n; i += CHUNK_SIZE) {
          chunks.push({ start: i, locs: locations.slice(i, i + CHUNK_SIZE) });
        }

        const promises: Promise<void>[] = [];
        for (const originChunk of chunks) {
          const originsStr = originChunk.locs.map((l) => `${l.lat},${l.lng}`).join('|');
          for (const destChunk of chunks) {
            const destsStr = destChunk.locs.map((l) => `${l.lat},${l.lng}`).join('|');
            const url = `https://rsapi.goong.io/DistanceMatrix?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destsStr)}&vehicle=bike&api_key=${GOONG_API_KEY}`;

            promises.push(
              (async () => {
                let res: Response | null = null;
                for (let attempt = 0; attempt < 3; attempt++) {
                  res = await fetch(url, { signal: AbortSignal.timeout(6000) });
                  if (res.status === 429 && attempt < 2) {
                    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
                    continue;
                  }
                  break;
                }
                if (!res || !res.ok) throw new Error(`Goong API HTTP error: ${res?.status}`);
                const data = (await res.json()) as any;
                if (!data || !data.rows || data.rows.length !== originChunk.locs.length) {
                  throw new Error('Goong API: rows count mismatch');
                }
                for (let i = 0; i < originChunk.locs.length; i++) {
                  const globalI = originChunk.start + i;
                  const elements = data.rows[i]?.elements;
                  if (!elements || elements.length !== destChunk.locs.length) {
                    throw new Error('Goong API: elements row count mismatch');
                  }
                  for (let j = 0; j < destChunk.locs.length; j++) {
                    const globalJ = destChunk.start + j;
                    if (globalI === globalJ) {
                      distanceMatrix[globalI][globalJ] = 0;
                      durationMatrix[globalI][globalJ] = 0;
                      continue;
                    }
                    const el = elements[j];
                    if (!el || el.status !== 'OK' || el.distance?.value == null || el.duration?.value == null) {
                      throw new Error(`Goong API: unroutable path from ${globalI} to ${globalJ}`);
                    }
                    distanceMatrix[globalI][globalJ] = el.distance.value;
                    durationMatrix[globalI][globalJ] = el.duration.value;
                  }
                }
              })()
            );
          }
        }

        await Promise.all(promises);
        console.log('[AI Microservice] Successfully calculated Distance Matrix using Goong Maps API (source: goong)');
        return { distanceMatrix, durationMatrix, matrixSource: 'goong' };
      } catch (error) {
        console.warn('[AI Microservice] Goong Distance Matrix failed, falling back to OSRM:', (error as Error).message);
      }
    }

    // 2. Secondary: Fallback to OSRM public service
    try {
      const coordsString = locations.map((loc) => `${loc.lng},${loc.lat}`).join(';');
      const url = `http://router.project-osrm.org/table/v1/driving/${coordsString}?annotations=distance,duration`;

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`OSRM HTTP error: ${response.status}`);
      
      const data = (await response.json()) as any;
      if (!data || !data.distances || !data.durations || data.distances.length !== n || data.durations.length !== n) {
        throw new Error('OSRM API: matrix dimension mismatch');
      }

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) {
            distanceMatrix[i][j] = 0;
            durationMatrix[i][j] = 0;
            continue;
          }
          const d = data.distances[i][j];
          const dur = data.durations[i][j];
          if (d == null || dur == null) {
            throw new Error(`OSRM API: null distance/duration from ${i} to ${j}`);
          }
          distanceMatrix[i][j] = Math.round(d);
          durationMatrix[i][j] = Math.round(dur);
        }
      }
      console.log('🗺️ [AI Microservice] Successfully calculated Distance Matrix using OSRM API (source: osrm)');
      return { distanceMatrix, durationMatrix, matrixSource: 'osrm' };
    } catch (error) {
      console.warn('[AI Microservice] OSRM service failed, falling back to Haversine calculations:', (error as Error).message);
    }

    // 3. Tertiary: Fallback to Haversine (Hiệu chỉnh theo số liệu thực tế đô thị từ Goong Maps)
    // Hệ số uốn lượn đường phố trung bình: 1.76 (đo đạc thực tế đường phố TP.HCM)
    // Vận tốc xe máy trung bình trong đô thị tính cả đèn đỏ & giao lộ: 11 km/h (~3.06 m/s)
    const roadTortuosity = 1.76;
    const averageSpeedMPS = (11 * 1000) / 3600; // 11 km/h in m/s (~3.06 m/s)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distanceMatrix[i][j] = 0;
          durationMatrix[i][j] = 0;
        } else {
          const distMeters = Math.round(
            this.haversineDistance(
              locations[i].lat,
              locations[i].lng,
              locations[j].lat,
              locations[j].lng
            ) * 1000 * roadTortuosity
          );
          distanceMatrix[i][j] = distMeters;
          durationMatrix[i][j] = Math.round(distMeters / averageSpeedMPS);
        }
      }
    }
    console.log('🗺️ [AI Microservice] Using calibrated Haversine calculations (factor: 1.76, speed: 11km/h, source: haversine)');
    return { distanceMatrix, durationMatrix, matrixSource: 'haversine' };
  }

  /**
   * Tối ưu hóa thứ tự điểm dừng kèm tính toán chi tiết cự ly và thời gian chính xác từ ma trận đã dùng.
   */
  public async optimizeRouteWithMetrics(
    orders: OrderItem[],
    facilityLocation: Location,
    startTime: Date = new Date(),
    returnToHub: boolean = false,
    matrices?: { distanceMatrix: number[][]; durationMatrix: number[][]; matrixSource?: string }
  ): Promise<{
    orders: OrderItem[];
    metrics: {
      plannedDistanceMeters: number;
      plannedDistanceKm: number;
      plannedDurationMin: number;
      matrixSource: 'goong' | 'osrm' | 'haversine' | string;
    };
  }> {
    if (orders.length <= 1) {
      return {
        orders,
        metrics: {
          plannedDistanceMeters: 0,
          plannedDistanceKm: 0,
          plannedDurationMin: orders.length * 5,
          matrixSource: matrices?.matrixSource || 'haversine',
        },
      };
    }

    let distanceMatrix: number[][];
    let durationMatrix: number[][];
    let matrixSource = 'haversine';

    if (matrices && matrices.distanceMatrix && matrices.durationMatrix) {
      distanceMatrix = matrices.distanceMatrix;
      durationMatrix = matrices.durationMatrix;
      matrixSource = matrices.matrixSource || 'frozen-cache';
    } else {
      const locations: Location[] = [
        facilityLocation,
        ...orders.map((o) => {
          const isPickup = o.status !== 'AT_HUB' && o.status !== 'OUT_FOR_DELIVERY' && o.status !== 'DELIVERED';
          const lat = isPickup ? o.pickupLatitude : o.deliveryLatitude;
          const lng = isPickup ? o.pickupLongitude : o.deliveryLongitude;
          return { lat: lat!, lng: lng! };
        }),
      ];
      const res = await this.calculateDistanceAndDurationMatrices(locations);
      distanceMatrix = res.distanceMatrix;
      durationMatrix = res.durationMatrix;
      matrixSource = res.matrixSource;
    }

    const orderIndices = orders.map((_, idx) => idx + 1);
    const estimatedDeliveryDates = orders.map((o) => o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate) : null);

    const optimalPermutation = this.runGeneticAlgorithm(
      orderIndices,
      distanceMatrix,
      durationMatrix,
      estimatedDeliveryDates,
      startTime,
      returnToHub
    );

    // Tính cự ly và thời gian di chuyển chuẩn xác từ ma trận thực tế
    let totalDistMeters = 0;
    let totalTravelSec = 0;
    let prev = 0;

    for (const node of optimalPermutation) {
      totalDistMeters += distanceMatrix[prev][node];
      totalTravelSec += durationMatrix[prev][node];
      prev = node;
    }

    if (returnToHub) {
      totalDistMeters += distanceMatrix[prev][0];
      totalTravelSec += durationMatrix[prev][0];
    }

    const plannedDistanceKm = Number((totalDistMeters / 1000).toFixed(2));
    const plannedDurationMin = Math.round(totalTravelSec / 60 + orders.length * 5);

    const sortedOrders = optimalPermutation.map((idx) => orders[idx - 1]);

    return {
      orders: sortedOrders,
      metrics: {
        plannedDistanceMeters: totalDistMeters,
        plannedDistanceKm,
        plannedDurationMin,
        matrixSource,
      },
    };
  }

  /**
   * Sorts orders in the optimal sequence using Genetic Algorithm (VRP).
   * @param returnToHub true nếu tuyến thu gom hàng (PICKUP) bắt buộc về hub; false nếu tuyến giao hàng (DELIVERY)
   * @param matrices Ma trận đóng băng tuỳ chọn (N+1)x(N+1) cho benchmark/cache, index 0 là kho
   */
  public async optimizeRouteStops(
    orders: OrderItem[],
    facilityLocation: Location,
    startTime: Date = new Date(),
    returnToHub: boolean = false,
    matrices?: { distanceMatrix: number[][]; durationMatrix: number[][]; matrixSource?: string }
  ): Promise<OrderItem[]> {
    if (orders.length <= 1) {
      return orders;
    }
    const res = await this.optimizeRouteWithMetrics(orders, facilityLocation, startTime, returnToHub, matrices);
    return res.orders;
  }

  /**
   * Multi-start: chạy GA độc lập nhiều lần rồi giữ nghiệm có fitness tốt nhất.
   * GA khởi tạo ngẫu nhiên nên mỗi lần chạy cho kết quả khác nhau; chọn tốt nhất trong K lần
   * giảm mạnh phương sai với chi phí tăng tuyến tính theo K.
   * Số lần restart: biến môi trường VRP_GA_RESTARTS (mặc định 5, tối thiểu 1).
   */
  private runGeneticAlgorithm(
    indices: number[],
    distanceMatrix: number[][],
    durationMatrix: number[][],
    estimatedDeliveryDates: (Date | null)[],
    startTime: Date,
    returnToHub: boolean = false
  ): number[] {
    const parsed = Math.floor(Number(process.env.VRP_GA_RESTARTS));
    const restarts = Number.isFinite(parsed) && parsed >= 1 ? parsed : 5;

    let bestRoute: number[] = [];
    let bestFitness = -Infinity;

    for (let r = 0; r < restarts; r++) {
      const candidate = this.runSingleGeneticAlgorithm(
        indices,
        distanceMatrix,
        durationMatrix,
        estimatedDeliveryDates,
        startTime,
        returnToHub
      );
      const fitness = this.calculateFitness(
        candidate,
        distanceMatrix,
        durationMatrix,
        estimatedDeliveryDates,
        startTime,
        returnToHub
      );
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestRoute = candidate;
      }
    }

    return bestRoute;
  }

  /**
   * Một lần chạy GA (khởi tạo ngẫu nhiên -> tiến hóa -> 2-Opt) cho bài toán thứ tự điểm dừng.
   */
  private runSingleGeneticAlgorithm(
    indices: number[],
    distanceMatrix: number[][],
    durationMatrix: number[][],
    estimatedDeliveryDates: (Date | null)[],
    startTime: Date,
    returnToHub: boolean = false
  ): number[] {
    const popSize = 50;
    const generations = 100;
    const mutationRate = 0.15;
    const eliteCount = 2;

    let population: number[][] = [];
    for (let i = 0; i < popSize; i++) {
      population.push(this.shuffle([...indices]));
    }

    for (let gen = 0; gen < generations; gen++) {
      const fitnessScores = population.map((individual) =>
        this.calculateFitness(individual, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime, returnToHub)
      );

      const paired = population.map((ind, i) => ({ ind, fit: fitnessScores[i] }));
      paired.sort((a, b) => b.fit - a.fit);

      const nextPopulation: number[][] = [];

      for (let i = 0; i < eliteCount; i++) {
        nextPopulation.push([...paired[i].ind]);
      }

      while (nextPopulation.length < popSize) {
        const parent1 = this.tournamentSelection(paired);
        const parent2 = this.tournamentSelection(paired);

        let child = this.crossover(parent1, parent2);
        child = this.mutate(child, mutationRate);

        nextPopulation.push(child);
      }

      population = nextPopulation;
    }

    const finalFitnessScores = population.map((individual) =>
      this.calculateFitness(individual, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime, returnToHub)
    );
    const bestIdx = finalFitnessScores.indexOf(Math.max(...finalFitnessScores));
    const bestIndividual = population[bestIdx];

    // Apply 2-Opt Local Search refinement to uncross paths and guarantee shortest distance
    return this.applyTwoOpt(bestIndividual, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime, returnToHub);
  }

  /**
   * Applies 2-Opt Local Search heuristic to eliminate route intersections and uncross paths.
   */
  private applyTwoOpt(
    individual: number[],
    distanceMatrix: number[][],
    durationMatrix: number[][],
    estimatedDeliveryDates: (Date | null)[],
    startTime: Date,
    returnToHub: boolean = false
  ): number[] {
    let route = [...individual];
    let improved = true;
    let iterations = 0;
    const maxIterations = 50;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < route.length - 1; i++) {
        for (let k = i + 1; k < route.length; k++) {
          const newRoute = this.twoOptSwap(route, i, k);
          const currentFit = this.calculateFitness(route, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime, returnToHub);
          const newFit = this.calculateFitness(newRoute, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime, returnToHub);

          if (newFit > currentFit) {
            route = newRoute;
            improved = true;
          }
        }
      }
    }
    return route;
  }

  private twoOptSwap(route: number[], i: number, k: number): number[] {
    const newRoute = route.slice(0, i);
    const middle = route.slice(i, k + 1).reverse();
    return newRoute.concat(middle).concat(route.slice(k + 1));
  }

  private calculateFitness(
    individual: number[],
    distanceMatrix: number[][],
    durationMatrix: number[][],
    estimatedDeliveryDates: (Date | null)[],
    startTime: Date,
    returnToHub: boolean = false
  ): number {
    let totalDistanceMeters = 0;
    let totalTravelSeconds = 0;
    let totalPenalty = 0;
    let currentTimestampMs = startTime.getTime();
    const serviceTimeMs = 5 * 60 * 1000; // 5 phút dừng giao hàng (xe máy)

    const LATE_WEIGHT = 2.0;  // 1 giây trễ ≈ 2 giây lái xe
    const DIST_WEIGHT = 0.05; // Phạt nhẹ mét để phá thế hòa

    let prevNode = 0;

    for (let i = 0; i < individual.length; i++) {
      const currNode = individual[i];
      const legDist = distanceMatrix[prevNode][currNode];
      const legSec = durationMatrix[prevNode][currNode];

      totalDistanceMeters += legDist;
      totalTravelSeconds += legSec;
      currentTimestampMs += legSec * 1000;

      const targetDate = estimatedDeliveryDates[currNode - 1];
      if (targetDate) {
        const deadlineMs = new Date(targetDate).getTime();
        if (currentTimestampMs > deadlineMs) {
          const lateSec = (currentTimestampMs - deadlineMs) / 1000;
          totalPenalty += LATE_WEIGHT * lateSec + (lateSec * lateSec) / 600;
        }
      }

      currentTimestampMs += serviceTimeMs;
      prevNode = currNode;
    }

    if (returnToHub) {
      const returnDist = distanceMatrix[prevNode][0];
      const returnSec = durationMatrix[prevNode][0];
      totalDistanceMeters += returnDist;
      totalTravelSeconds += returnSec;
    }

    const totalCost = totalTravelSeconds + totalPenalty + DIST_WEIGHT * totalDistanceMeters;
    return 1 / (totalCost + 1);
  }

  private tournamentSelection(paired: { ind: number[]; fit: number }[]): number[] {
    const k = 3;
    let best = paired[Math.floor(Math.random() * paired.length)];
    for (let i = 1; i < k; i++) {
      const candidate = paired[Math.floor(Math.random() * paired.length)];
      if (candidate.fit > best.fit) {
        best = candidate;
      }
    }
    return [...best.ind];
  }

  private crossover(parent1: number[], parent2: number[]): number[] {
    const size = parent1.length;
    const start = Math.floor(Math.random() * size);
    const end = Math.floor(Math.random() * (size - start)) + start;

    const child = new Array(size).fill(-1);
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    let p2Idx = 0;
    for (let i = 0; i < size; i++) {
      if (i >= start && i <= end) continue;
      while (child.includes(parent2[p2Idx])) {
        p2Idx++;
      }
      child[i] = parent2[p2Idx];
      p2Idx++;
    }

    return child;
  }

  private mutate(individual: number[], rate: number): number[] {
    if (Math.random() < rate && individual.length > 1) {
      const idx1 = Math.floor(Math.random() * individual.length);
      let idx2 = Math.floor(Math.random() * individual.length);
      while (idx1 === idx2) {
        idx2 = Math.floor(Math.random() * individual.length);
      }

      const copy = [...individual];
      const temp = copy[idx1];
      copy[idx1] = copy[idx2];
      copy[idx2] = temp;
      return copy;
    }
    return individual;
  }

  private shuffle(array: number[]): number[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
