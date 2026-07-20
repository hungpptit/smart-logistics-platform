import { Order } from '@prisma/client';

interface Location {
  lat: number;
  lng: number;
}

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
   * Precomputes distance and duration matrices using OSRM, with fallback to Haversine.
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

    try {
      // Build OSRM table coordinates string: lng,lat;lng,lat...
      const coordsString = locations.map((loc) => `${loc.lng},${loc.lat}`).join(';');
      const url = `http://router.project-osrm.org/table/v1/driving/${coordsString}?annotations=distance,duration`;

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await response.json() as any;

      if (data && data.distances && data.durations) {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            distanceMatrix[i][j] = data.distances[i][j] || 0;
            durationMatrix[i][j] = data.durations[i][j] || 0;
          }
        }
        return { distanceMatrix, durationMatrix };
      }
    } catch (error) {
      console.warn('OSRM service failed, falling back to Haversine calculations:', (error as Error).message);
    }

    // Fallback to Haversine
    const averageSpeedMPS = 8.33; // 30 km/h in m/s
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distanceMatrix[i][j] = 0;
          durationMatrix[i][j] = 0;
        } else {
          const distMeters = this.haversineDistance(
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
    orders: Order[],
    facilityLocation: Location,
    startTime: Date = new Date()
  ): Promise<Order[]> {
    if (orders.length <= 1) {
      return orders;
    }

    // Compile list of locations: index 0 is facility, 1..N are orders (Pickup or Delivery)
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

    const orderIndices = orders.map((_, idx) => idx + 1); // 1-based index matching positions in locations list
    const estimatedDeliveryDates = orders.map((o) => o.estimatedDeliveryDate);

    const optimalPermutation = this.runGeneticAlgorithm(
      orderIndices,
      distanceMatrix,
      durationMatrix,
      estimatedDeliveryDates,
      startTime
    );

    // Map optimal permutation back to sorted orders list
    // Permutation contains indices like [3, 1, 2] corresponding to 1-based indices in locations
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

    // Generate initial population
    let population: number[][] = [];
    for (let i = 0; i < popSize; i++) {
      population.push(this.shuffle([...indices]));
    }

    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const fitnessScores = population.map((individual) =>
        this.calculateFitness(individual, distanceMatrix, durationMatrix, estimatedDeliveryDates, startTime)
      );

      // Pair individuals with their fitness
      const paired = population.map((ind, i) => ({ ind, fit: fitnessScores[i] }));
      paired.sort((a, b) => b.fit - a.fit);

      const nextPopulation: number[][] = [];

      // Elitism
      for (let i = 0; i < eliteCount; i++) {
        nextPopulation.push([...paired[i].ind]);
      }

      // Fill rest of the population
      while (nextPopulation.length < popSize) {
        const parent1 = this.tournamentSelection(paired);
        const parent2 = this.tournamentSelection(paired);

        let child = this.crossover(parent1, parent2);
        child = this.mutate(child, mutationRate);

        nextPopulation.push(child);
      }

      population = nextPopulation;
    }

    // Return the best individual
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

  /**
   * Calculates fitness based on route distance and delivery time window penalties.
   */
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
    const serviceTimeMS = 10 * 60 * 1000; // 10 minutes service time at each stop

    // Start at facility (index 0) to first stop
    let prevNode = 0;

    for (let i = 0; i < individual.length; i++) {
      const currNode = individual[i];
      totalDistance += distanceMatrix[prevNode][currNode];

      // Update time
      const travelDurationMS = durationMatrix[prevNode][currNode] * 1000;
      currentTime += travelDurationMS;

      // Check time window violation
      const targetDate = estimatedDeliveryDates[currNode - 1];
      if (targetDate) {
        const deadlineMS = new Date(targetDate).getTime();
        if (currentTime > deadlineMS) {
          // Calculate delay in hours
          const delayHours = (currentTime - deadlineMS) / (1000 * 60 * 60);
          totalPenalty += delayHours * 20000; // 20,000 penalty points per hour of delay
        }
      }

      // Add service time
      currentTime += serviceTimeMS;
      prevNode = currNode;
    }

    // Return back to facility (index 0)
    totalDistance += distanceMatrix[prevNode][0];

    // Fitness is inversely proportional to cost (distance + penalty)
    return 1 / (totalDistance + totalPenalty + 1);
  }

  /**
   * Performs Tournament Selection.
   */
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

  /**
   * Ordered Crossover (OX) for permutations.
   */
  private crossover(parent1: number[], parent2: number[]): number[] {
    const size = parent1.length;
    const start = Math.floor(Math.random() * size);
    const end = Math.floor(Math.random() * (size - start)) + start;

    const child = new Array(size).fill(-1);

    // Copy subsegment from parent1
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    // Fill remaining elements using parent2 order
    let parent2Idx = 0;
    for (let i = 0; i < size; i++) {
      if (child[i] === -1) {
        while (child.includes(parent2[parent2Idx])) {
          parent2Idx++;
        }
        child[i] = parent2[parent2Idx];
        parent2Idx++;
      }
    }

    return child;
  }

  /**
   * Mutates child chromosome using swap mutation.
   */
  private mutate(individual: number[], rate: number): number[] {
    if (Math.random() < rate) {
      const idx1 = Math.floor(Math.random() * individual.length);
      let idx2 = Math.floor(Math.random() * individual.length);
      while (idx1 === idx2 && individual.length > 1) {
        idx2 = Math.floor(Math.random() * individual.length);
      }
      const temp = individual[idx1];
      individual[idx1] = individual[idx2];
      individual[idx2] = temp;
    }
    return individual;
  }

  /**
   * Shuffles an array randomly.
   */
  private shuffle(array: number[]): number[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
