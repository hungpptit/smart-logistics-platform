import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { VRPService } from '../services/routing/vrp.service';
import { KMeansService, OrderItem } from '../services/routing/kmeans.service';

dotenv.config();
const prisma = new PrismaClient();
const vrpService = new VRPService();
const kmeansService = new KMeansService();

interface Loc {
  lat: number;
  lng: number;
}

interface PlanEvaluation {
  totalKm: number;
  totalTravelMin: number;
  totalServiceMin: number;
  totalMin: number;
  makespanMin: number;
  activeVehicles: number;
  lateOrdersCount: number;
  clusterSizes: number[];
}

function calcStats(nums: number[]): { mean: number; std: number; min: number; max: number } {
  const n = nums.length;
  if (n === 0) return { mean: 0, std: 0, min: 0, max: 0 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const std = Math.sqrt(variance);
  return {
    mean: Math.round(mean * 100) / 100,
    std: Math.round(std * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
  };
}

// Đánh giá chuẩn hóa duy nhất
function evaluateRoutes(
  clusters: OrderItem[][],
  distMatrix: number[][],
  durMatrix: number[][],
  locIndexMap: Map<string, number>,
  serviceTimeSec = 300
): PlanEvaluation {
  let totalMeters = 0;
  let totalTravelSec = 0;
  let totalServiceSec = 0;
  let makespanSec = 0;
  let totalLate = 0;

  clusters.forEach((orders) => {
    let routeMeters = 0;
    let routeTravelSec = 0;
    let currentClockSec = 0;
    let lateCount = 0;

    let u = 0; // Hub
    for (const ord of orders) {
      const v = locIndexMap.get(ord.id)!;
      const d = distMatrix[u][v];
      const t = durMatrix[u][v];
      routeMeters += d;
      routeTravelSec += t;
      currentClockSec += t + serviceTimeSec;

      if (ord.orderType === 'EXPRESS' && currentClockSec > 2 * 3600) {
        lateCount++;
      } else if (ord.orderType === 'STANDARD' && currentClockSec > 4 * 3600) {
        lateCount++;
      }

      u = v;
    }

    const routeServiceSec = orders.length * serviceTimeSec;
    const routeTotalSec = routeTravelSec + routeServiceSec;
    if (routeTotalSec > makespanSec) makespanSec = routeTotalSec;

    totalMeters += routeMeters;
    totalTravelSec += routeTravelSec;
    totalServiceSec += routeServiceSec;
    totalLate += lateCount;
  });

  return {
    totalKm: Math.round((totalMeters / 1000) * 100) / 100,
    totalTravelMin: Math.round((totalTravelSec / 60) * 10) / 10,
    totalServiceMin: Math.round((totalServiceSec / 60) * 10) / 10,
    totalMin: Math.round(((totalTravelSec + totalServiceSec) / 60) * 10) / 10,
    makespanMin: Math.round((makespanSec / 60) * 10) / 10,
    activeVehicles: clusters.filter((c) => c.length > 0).length,
    lateOrdersCount: totalLate,
    clusterSizes: clusters.map((c) => c.length),
  };
}

// Gọi OR-Tools solver Python
async function runOrToolsMultiVehicle(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'ortools_multivehicle_solver.py');
    const py = spawn('python', [pythonScript]);

    let output = '';
    let errorOutput = '';

    py.stdout.on('data', (data) => (output += data.toString()));
    py.stderr.on('data', (data) => (errorOutput += data.toString()));

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
      }
      try {
        const parsed = JSON.parse(output);
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Failed to parse OR-Tools output: ${output} (stderr: ${errorOutput})`));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

// Phân cụm K-Means tổng quát cho phép cấu hình maxOrdersPerCluster (13 hoặc 25)
function runKMeansVariant(orders: OrderItem[], k: number, maxOrders: number): OrderItem[][] {
  const validOrders = orders.filter((o) => o.deliveryLatitude != null && o.deliveryLongitude != null);
  if (validOrders.length === 0 || k <= 0) return [];

  // Khởi tạo tâm
  const centroids: Loc[] = [];
  const used = new Set<number>();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * validOrders.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push({ lat: validOrders[idx].deliveryLatitude!, lng: validOrders[idx].deliveryLongitude! });
    }
  }

  let assignments = new Array(validOrders.length).fill(0);
  for (let it = 0; it < 30; it++) {
    for (let i = 0; i < validOrders.length; i++) {
      const o = validOrders[i];
      let minDist = Infinity;
      let best = 0;
      for (let j = 0; j < k; j++) {
        const d = kmeansService.haversineDistance(o.deliveryLatitude!, o.deliveryLongitude!, centroids[j].lat, centroids[j].lng);
        if (d < minDist) {
          minDist = d;
          best = j;
        }
      }
      assignments[i] = best;
    }

    const sums = Array.from({ length: k }, () => ({ lat: 0, lng: 0, count: 0 }));
    for (let i = 0; i < validOrders.length; i++) {
      const c = assignments[i];
      sums[c].lat += validOrders[i].deliveryLatitude!;
      sums[c].lng += validOrders[i].deliveryLongitude!;
      sums[c].count++;
    }
    for (let j = 0; j < k; j++) {
      if (sums[j].count > 0) {
        centroids[j] = { lat: sums[j].lat / sums[j].count, lng: sums[j].lng / sums[j].count };
      }
    }
  }

  const clusters: OrderItem[][] = Array.from({ length: k }, () => []);
  validOrders.forEach((o, i) => clusters[assignments[i]].push(o));

  // Ép tải nếu có trần maxOrders
  for (let c = 0; c < k; c++) {
    while (clusters[c].length > maxOrders) {
      let maxD = -1;
      let outIdx = -1;
      clusters[c].forEach((ord, idx) => {
        const d = kmeansService.haversineDistance(ord.deliveryLatitude!, ord.deliveryLongitude!, centroids[c].lat, centroids[c].lng);
        if (d > maxD) {
          maxD = d;
          outIdx = idx;
        }
      });

      const moved = clusters[c].splice(outIdx, 1)[0];
      let targetC = -1;
      let targetDist = Infinity;
      for (let other = 0; other < k; other++) {
        if (other !== c && clusters[other].length < maxOrders) {
          const d = kmeansService.haversineDistance(moved.deliveryLatitude!, moved.deliveryLongitude!, centroids[other].lat, centroids[other].lng);
          if (d < targetDist) {
            targetDist = d;
            targetC = other;
          }
        }
      }
      if (targetC !== -1) {
        clusters[targetC].push(moved);
      } else {
        clusters[c].push(moved);
        break;
      }
    }
  }

  return clusters;
}

// Giải GA từng cụm bằng cắt ma trận con
async function solveClustersWithGA(
  facilityLoc: Loc,
  clusters: OrderItem[][],
  distMatrix: number[][],
  durMatrix: number[][],
  locIndexMap: Map<string, number>
): Promise<OrderItem[][]> {
  const solved: OrderItem[][] = [];
  for (const c of clusters) {
    if (c.length <= 1) {
      solved.push(c);
      continue;
    }
    const n = c.length + 1;
    const subDist: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const subDur: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const subIndices = [0, ...c.map((o) => locIndexMap.get(o.id)!)];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        subDist[i][j] = distMatrix[subIndices[i]][subIndices[j]];
        subDur[i][j] = durMatrix[subIndices[i]][subIndices[j]];
      }
    }
    const res = await vrpService.optimizeRouteWithMetrics(
      c as any,
      facilityLoc,
      new Date(),
      false,
      { distanceMatrix: subDist, durationMatrix: subDur, matrixSource: 'goong' }
    );
    solved.push((res.orders as any) || c);
  }
  return solved;
}

// Chạy 1 trial với multi-start M lần
async function runClusteringTrial(
  orders: OrderItem[],
  facilityLoc: Loc,
  distMatrix: number[][],
  durMatrix: number[][],
  locIndexMap: Map<string, number>,
  maxOrders: number,
  multiStartRestarts: number
): Promise<PlanEvaluation> {
  let bestEval: PlanEvaluation | null = null;

  for (let r = 0; r < multiStartRestarts; r++) {
    const rawClusters = runKMeansVariant(orders, 4, maxOrders);
    const solvedClusters = await solveClustersWithGA(facilityLoc, rawClusters, distMatrix, durMatrix, locIndexMap);
    const evaluation = evaluateRoutes(solvedClusters, distMatrix, durMatrix, locIndexMap);

    if (!bestEval || evaluation.totalKm < bestEval.totalKm) {
      bestEval = evaluation;
    }
  }

  return bestEval!;
}

async function main() {
  console.log('🚀 BẮT ĐẦU THÍ NGHIỆM ABLATION 2x2 TRÊN MA TRẬN GOONG 52x52 ĐÃ ĐÓNG BĂNG...');

  const fac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-TD-DANGBI' },
    include: { address: true },
  });
  if (!fac || !fac.address) throw new Error('Không tìm thấy bưu cục Đặng Văn Bi!');

  const facilityLoc: Loc = { lat: fac.address.latitude, lng: fac.address.longitude };
  const dbOrders = await prisma.order.findMany({
    where: { destinationFacilityId: fac.id, status: 'AT_HUB' },
    include: { package: true },
  });

  const orders: OrderItem[] = dbOrders.map((o) => ({
    id: o.id,
    orderCode: o.orderCode,
    status: o.status,
    pickupLatitude: o.pickupLatitude,
    pickupLongitude: o.pickupLongitude,
    deliveryLatitude: o.deliveryLatitude,
    deliveryLongitude: o.deliveryLongitude,
    deliveryDeadline: o.deliveryDeadline,
    orderType: o.orderType,
    deliveryAddressText: o.deliveryAddressText,
    package: o.package,
  }));

  const locIndexMap = new Map<string, number>();
  orders.forEach((o, idx) => locIndexMap.set(o.id, idx + 1));

  const fixturePath = path.join(__dirname, 'test_fixtures', 'phase4_dangbi_51_goong_matrix.json');
  if (!fs.existsSync(fixturePath)) throw new Error('Không tìm thấy file ma trận Goong!');
  const cacheData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const { distanceMatrix, durationMatrix } = cacheData;

  const weightsKg: number[] = orders.map((o) => (o as any).package?.weightKg || 1.0);
  const volumesM3: number[] = orders.map((o) => {
    const pkg = (o as any).package;
    return pkg ? ((pkg.widthCm || 20) * (pkg.heightCm || 20) * (pkg.lengthCm || 20)) / 1000000 : 0.008;
  });

  const SAMPLES = 30;

  // 1. [Trần 13 | Single-start (1 lần)]
  console.log(`\n1. Chạy Biến thể [Trần 13 | Single-start] (${SAMPLES} mẫu)...`);
  const v1Results: PlanEvaluation[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const res = await runClusteringTrial(orders, facilityLoc, distanceMatrix, durationMatrix, locIndexMap, 13, 1);
    v1Results.push(res);
  }

  // 2. [Trần 13 | Multi-start (Best of 5)]
  console.log(`2. Chạy Biến thể [Trần 13 | Multi-start 5] (${SAMPLES} mẫu)...`);
  const v2Results: PlanEvaluation[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const res = await runClusteringTrial(orders, facilityLoc, distanceMatrix, durationMatrix, locIndexMap, 13, 5);
    v2Results.push(res);
  }

  // 3. [Trần 25 | Single-start (1 lần)]
  console.log(`3. Chạy Biến thể [Trần 25 | Single-start] (${SAMPLES} mẫu)...`);
  const v3Results: PlanEvaluation[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const res = await runClusteringTrial(orders, facilityLoc, distanceMatrix, durationMatrix, locIndexMap, 25, 1);
    v3Results.push(res);
  }

  // 4. [Trần 25 | Multi-start (Best of 5)]
  console.log(`4. Chạy Biến thể [Trần 25 | Multi-start 5] (${SAMPLES} mẫu)...`);
  const v4Results: PlanEvaluation[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const res = await runClusteringTrial(orders, facilityLoc, distanceMatrix, durationMatrix, locIndexMap, 25, 5);
    v4Results.push(res);
  }

  // 5. OR-Tools Biến thể A (Đủ 4 xe, >=4 đơn, Tối ưu theo Thời gian)
  console.log('\n5. Chạy OR-Tools Biến thể A (Tối ưu Thời gian lái)...');
  const ortoolsVarA = await runOrToolsMultiVehicle({
    distanceMatrix,
    durationMatrix,
    numVehicles: 4,
    maxStopsPerVehicle: 25,
    minStopsPerVehicle: 4,
    forceAllVehicles: true,
    returnToHub: false,
    maxDurationMin: 180,
    timeLimitSeconds: 10,
    weights: weightsKg,
    volumes: volumesM3,
    objective: 'time', // Tối ưu theo THỜI GIAN LÁI
  });
  let evalOrtoolsA: PlanEvaluation | null = null;
  if (ortoolsVarA.success) {
    const clustersA: OrderItem[][] = ortoolsVarA.routes.map((r: any) => r.stops.map((idx: number) => orders[idx - 1]));
    evalOrtoolsA = evaluateRoutes(clustersA, distanceMatrix, durationMatrix, locIndexMap);
  } else {
    console.warn('Cảnh báo: OR-Tools Biến thể A không tìm được nghiệm:', ortoolsVarA.message);
  }

  // 6. OR-Tools Biến thể B (Tự do số xe, Tối ưu theo Thời gian)
  console.log('6. Chạy OR-Tools Biến thể B (Tối ưu Thời gian lái)...');
  const ortoolsVarB = await runOrToolsMultiVehicle({
    distanceMatrix,
    durationMatrix,
    numVehicles: 4,
    maxStopsPerVehicle: 25,
    forceAllVehicles: false,
    returnToHub: false,
    maxDurationMin: 180,
    timeLimitSeconds: 10,
    weights: weightsKg,
    volumes: volumesM3,
    objective: 'time', // Tối ưu theo THỜI GIAN LÁI
  });
  let evalOrtoolsB: PlanEvaluation | null = null;
  if (ortoolsVarB.success) {
    const clustersB: OrderItem[][] = ortoolsVarB.routes.filter((r: any) => r.stopsCount > 0).map((r: any) => r.stops.map((idx: number) => orders[idx - 1]));
    evalOrtoolsB = evaluateRoutes(clustersB, distanceMatrix, durationMatrix, locIndexMap);
  } else {
    console.warn('Cảnh báo: OR-Tools Biến thể B không tìm được nghiệm:', ortoolsVarB.message);
  }

  // Tính thống kê
  const s1Km = calcStats(v1Results.map((r) => r.totalKm));
  const s1Travel = calcStats(v1Results.map((r) => r.totalTravelMin));
  const s1Makespan = calcStats(v1Results.map((r) => r.makespanMin));
  const s1Late = calcStats(v1Results.map((r) => r.lateOrdersCount));

  const s2Km = calcStats(v2Results.map((r) => r.totalKm));
  const s2Travel = calcStats(v2Results.map((r) => r.totalTravelMin));
  const s2Makespan = calcStats(v2Results.map((r) => r.makespanMin));
  const s2Late = calcStats(v2Results.map((r) => r.lateOrdersCount));

  const s3Km = calcStats(v3Results.map((r) => r.totalKm));
  const s3Travel = calcStats(v3Results.map((r) => r.totalTravelMin));
  const s3Makespan = calcStats(v3Results.map((r) => r.makespanMin));
  const s3Late = calcStats(v3Results.map((r) => r.lateOrdersCount));

  const s4Km = calcStats(v4Results.map((r) => r.totalKm));
  const s4Travel = calcStats(v4Results.map((r) => r.totalTravelMin));
  const s4Makespan = calcStats(v4Results.map((r) => r.makespanMin));
  const s4Late = calcStats(v4Results.map((r) => r.lateOrdersCount));

  console.log('\n========================================================================================================================');
  console.log('📊 BẢNG KẾT QUẢ THÍ NGHIỆM ABLATION 2x2: TẢI TRỌNG vs KHỞI TẠO MULTI-START (30 MẪU / BIẾN THỂ)');
  console.log('========================================================================================================================');
  console.log('| Biến thể | Tổng km (Mean ± Std) | Dải km [Min - Max] | Phút lái (Mean) | Makespan (Mean / Max) | Đơn trễ (Mean) |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');
  console.log(`| **1. Trần 13 × 1 lần** | ${s1Km.mean} ± ${s1Km.std} km | [${s1Km.min} - ${s1Km.max}] | ${s1Travel.mean}p | ${s1Makespan.mean}p / ${s1Makespan.max}p | ${s1Late.mean} đơn |`);
  console.log(`| **2. Trần 13 × Multi-5** | ${s2Km.mean} ± ${s2Km.std} km | [${s2Km.min} - ${s2Km.max}] | ${s2Travel.mean}p | ${s2Makespan.mean}p / ${s2Makespan.max}p | ${s2Late.mean} đơn |`);
  console.log(`| **3. Trần 25 × 1 lần** | ${s3Km.mean} ± ${s3Km.std} km | [${s3Km.min} - ${s3Km.max}] | ${s3Travel.mean}p | ${s3Makespan.mean}p / ${s3Makespan.max}p | ${s3Late.mean} đơn |`);
  console.log(`| **4. Trần 25 × Multi-5** | ${s4Km.mean} ± ${s4Km.std} km | [${s4Km.min} - ${s4Km.max}] | ${s4Travel.mean}p | ${s4Makespan.mean}p / ${s4Makespan.max}p | ${s4Late.mean} đơn |`);
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');
  if (evalOrtoolsA) {
    console.log(`| **5. OR-Tools (Đủ 4 xe, Min Time)** | **${evalOrtoolsA.totalKm} km** | - | **${evalOrtoolsA.totalTravelMin}p** | **${evalOrtoolsA.makespanMin}p** | **${evalOrtoolsA.lateOrdersCount} đơn** |`);
  }
  if (evalOrtoolsB) {
    console.log(`| **6. OR-Tools (Tự do xe, Min Time)** | **${evalOrtoolsB.totalKm} km** | - | **${evalOrtoolsB.totalTravelMin}p** | **${evalOrtoolsB.makespanMin}p** | **${evalOrtoolsB.lateOrdersCount} đơn** |`);
  }
  console.log('========================================================================================================================\n');
}

main()
  .catch((e) => {
    console.error('LỖI THỰC THI:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
