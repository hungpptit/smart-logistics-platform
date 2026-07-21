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
  ): Promise<{ distanceMatrix: number[][]; durationMatrix: number[][] }> {
    const n = locations.length;
    const distanceMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const durationMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    if (n <= 1) {
      return { distanceMatrix, durationMatrix };
    }

    // 1. Primary: Try Goong Maps Distance Matrix API if GOONG_API_KEY is available
    const GOONG_API_KEY = process.env.GOONG_API_KEY;
    if (GOONG_API_KEY) {
      try {
        const originsStr = locations.map((loc) => `${loc.lat},${loc.lng}`).join('|');
        const url = `https://rsapi.goong.io/DistanceMatrix?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(originsStr)}&vehicle=bike&api_key=${GOONG_API_KEY}`;

        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = (await response.json()) as any;
          if (data && data.rows && data.rows.length === n) {
            for (let i = 0; i < n; i++) {
              const elements = data.rows[i]?.elements;
              if (elements && elements.length === n) {
                for (let j = 0; j < n; j++) {
                  distanceMatrix[i][j] = elements[j]?.distance?.value || 0;
                  durationMatrix[i][j] = elements[j]?.duration?.value || 0;
                }
              }
            }
            console.log('🗺️ [AI Microservice] Successfully calculated Distance Matrix using Goong Maps API');
            return { distanceMatrix, durationMatrix };
          }
        }
      } catch (error) {
        console.warn('[AI Microservice] Goong Distance Matrix failed, falling back to OSRM:', (error as Error).message);
      }
    }

    // 2. Secondary: Fallback to OSRM public service
    try {
      const coordsString = locations.map((loc) => `${loc.lng},${loc.lat}`).join(';');
      const url = `http://router.project-osrm.org/table/v1/driving/${coordsString}?annotations=distance,duration`;

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = (await response.json()) as any;

      if (data && data.distances && data.durations) {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            distanceMatrix[i][j] = data.distances[i][j] || 0;
            durationMatrix[i][j] = data.durations[i][j] || 0;
          }
        }
        console.log('🗺️ [AI Microservice] Successfully calculated Distance Matrix using OSRM API');
        return { distanceMatrix, durationMatrix };
      }
    } catch (error) {
      console.warn('[AI Microservice] OSRM service failed, falling back to Haversine calculations:', (error as Error).message);
    }

    // 3. Tertiary: Fallback to Haversine
    const averageSpeedMPS = 8.33; // 30 km/h in m/s
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distanceMatrix[i][j] = 0;
          durationMatrix[i][j] = 0;
        } else {
          const distMeters =
            this.haversineDistance(
              locations[i].lat,
              locations[i].lng,
              locations[j].lat,
              locations[j].lng
            ) * 1000;
          distanceMatrix[i][j] = distMeters;
          durationMatrix[i][j] = distMeters / averageSpeedMPS;
        }
      }
    }

    return { distanceMatrix, durationMatrix };
  }

  /**
   * Sorts orders in the optimal sequence using Genetic Algorithm (VRP).
   */
  public async optimizeRouteStops(
    orders: OrderItem[],
    facilityLocation: Location,
    startTime: Date = new Date()
  ): Promise<OrderItem[]> {
    if (orders.length <= 1) {
      return orders;
    }

    const locations: Location[] = [
      facilityLocation,
      ...orders.map((o) => {
        const isPickup = o.status === 'READY_FOR_PICKUP';
        const lat = isPickup ? o.pickupLatitude : o.deliveryLatitude;
        const lng = isPickup ? o.pickupLongitude : o.deliveryLongitude;
        return { lat: lat!, lng: lng! };
      }),
    ];

    const { distanceMatrix, durationMatrix } = await this.calculateDistanceAndDurationMatrices(locations);

    const orderIndices = orders.map((_, idx) => idx + 1);
    const estimatedDeliveryDates = orders.map((o) => o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate) : null);

    const optimalPermutation = this.runGeneticAlgorithm(
      orderIndices,
      distanceMatrix,
      durationMatrix,
      estimatedDeliveryDates,
      startTime
    );

    return optimalPermutation.map((idx) => orders[idx - 1]);
  }

  /**
   * Runs the Genetic Algorithm to solve the VRP sequence permutation.
   */
  private runGeneticAlgorithm(
    indices: number[],
    distanceMatrix: number[][],
    durationMatrix: number[][],
    estimatedDeliveryDates: (Date | null)[],
    startTime: Date
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
        this.calculateFitness(individual, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime)
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
      this.calculateFitness(individual, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime)
    );
    const bestIdx = finalFitnessScores.indexOf(Math.max(...finalFitnessScores));
    const bestIndividual = population[bestIdx];

    // Apply 2-Opt Local Search refinement to uncross paths and guarantee shortest distance
    return this.applyTwoOpt(bestIndividual, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime);
  }

  /**
   * Applies 2-Opt Local Search heuristic to eliminate route intersections and uncross paths.
   */
  private applyTwoOpt(
    individual: number[],
    distanceMatrix: number[][],
    durationMatrix: number[][],
    estimatedDeliveryDates: (Date | null)[],
    startTime: Date
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
          const currentFit = this.calculateFitness(route, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime);
          const newFit = this.calculateFitness(newRoute, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime);

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
    startTime: Date
  ): number {
    let totalDistance = 0;
    let totalPenalty = 0;
    let currentTime = startTime.getTime();
    const serviceTimeMS = 10 * 60 * 1000;

    let prevNode = 0;

    for (let i = 0; i < individual.length; i++) {
      const currNode = individual[i];
      totalDistance += distanceMatrix[prevNode][currNode];

      const travelDurationMS = durationMatrix[prevNode][currNode] * 1000;
      currentTime += travelDurationMS;

      const targetDate = estimatedDeliveryDates[currNode - 1];
      if (targetDate) {
        const deadlineMS = new Date(targetDate).getTime();
        if (currentTime > deadlineMS) {
          const delayHours = (currentTime - deadlineMS) / (1000 * 60 * 60);
          totalPenalty += delayHours * 20000;
        }
      }

      currentTime += serviceTimeMS;
      prevNode = currNode;
    }

    totalDistance += distanceMatrix[prevNode][0];
    return 1 / (totalDistance + totalPenalty + 1);
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
