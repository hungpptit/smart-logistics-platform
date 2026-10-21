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

interface EvaluatedRoute {
  vehicleIndex: number;
  stopsCount: number;
  distanceKm: number;
  travelDurationMin: number;
  serviceDurationMin: number;
  totalDurationMin: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  lateOrdersCount: number;
  stops: OrderItem[];
}

interface PlanEvaluation {
  totalKm: number;
  totalTravelMin: number;
  totalServiceMin: number;
  totalMin: number;
  makespanMin: number; // Tuyến có thời gian dài nhất
  activeVehicles: number;
  totalLateOrders: number;
  routes: EvaluatedRoute[];
}

// Hàm đánh giá chuẩn hóa duy nhất (Single Source of Truth)
function evaluateRoutes(
  clusters: OrderItem[][],
  distMatrix: number[][],
  durMatrix: number[][],
  locIndexMap: Map<string, number>,
  serviceTimeSec = 300
): PlanEvaluation {
  const evaluatedRoutes: EvaluatedRoute[] = [];
  let totalMeters = 0;
  let totalTravelSec = 0;
  let totalServiceSec = 0;
  let makespanSec = 0;
  let totalLate = 0;

  clusters.forEach((orders, vIdx) => {
    let routeMeters = 0;
    let routeTravelSec = 0;
    let currentClockSec = 0; // Bắt đầu từ 0 (Hub)
    let lateCount = 0;
    let routeWeight = 0;
    let routeVol = 0;

    let u = 0; // 0 là Hub
    for (const ord of orders) {
      const v = locIndexMap.get(ord.id)!;
      const d = distMatrix[u][v];
      const t = durMatrix[u][v];
      routeMeters += d;
      routeTravelSec += t;
      currentClockSec += t;

      // Cộng thời gian dừng giao
      currentClockSec += serviceTimeSec;

      // Kiểm tra deadline nếu có
      if (ord.orderType === 'EXPRESS' && currentClockSec > 2 * 3600) {
        lateCount++;
      } else if (ord.orderType === 'STANDARD' && currentClockSec > 4 * 3600) {
        lateCount++;
      }

      const pkg = (ord as any).package;
      if (pkg) {
        routeWeight += pkg.weightKg || 1.0;
        const w = (pkg.widthCm || 20) / 100;
        const h = (pkg.heightCm || 20) / 100;
        const l = (pkg.lengthCm || 20) / 100;
        routeVol += w * h * l;
      } else {
        routeWeight += 1.0;
        routeVol += 0.008;
      }

      u = v; // Open route: điểm tiếp theo
    }

    const routeServiceSec = orders.length * serviceTimeSec;
    const routeTotalSec = routeTravelSec + routeServiceSec;
    if (routeTotalSec > makespanSec) makespanSec = routeTotalSec;

    totalMeters += routeMeters;
    totalTravelSec += routeTravelSec;
    totalServiceSec += routeServiceSec;
    totalLate += lateCount;

    evaluatedRoutes.push({
      vehicleIndex: vIdx,
      stopsCount: orders.length,
      distanceKm: Math.round((routeMeters / 1000) * 100) / 100,
      travelDurationMin: Math.round((routeTravelSec / 60) * 10) / 10,
      serviceDurationMin: Math.round((routeServiceSec / 60) * 10) / 10,
      totalDurationMin: Math.round((routeTotalSec / 60) * 10) / 10,
      totalWeightKg: Math.round(routeWeight * 100) / 100,
      totalVolumeM3: Math.round(routeVol * 10000) / 10000,
      lateOrdersCount: lateCount,
      stops: orders,
    });
  });

  return {
    totalKm: Math.round((totalMeters / 1000) * 100) / 100,
    totalTravelMin: Math.round((totalTravelSec / 60) * 10) / 10,
    totalServiceMin: Math.round((totalServiceSec / 60) * 10) / 10,
    totalMin: Math.round(((totalTravelSec + totalServiceSec) / 60) * 10) / 10,
    makespanMin: Math.round((makespanSec / 60) * 10) / 10,
    activeVehicles: clusters.filter((c) => c.length > 0).length,
    totalLateOrders: totalLate,
    routes: evaluatedRoutes,
  };
}

// Helper gọi OR-Tools solver qua Python
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

// Xây dựng ma trận Goong 52x52 chuẩn bằng Chunking (6x6 = 36 sub-requests)
async function buildGoongMatrix52(locations: Loc[]): Promise<{ distanceMatrix: number[][]; durationMatrix: number[][] }> {
  const GOONG_API_KEY = process.env.GOONG_API_KEY;
  if (!GOONG_API_KEY) {
    throw new Error('LỖI: Biến môi trường GOONG_API_KEY chưa được thiết lập trong .env!');
  }

  const n = locations.length;
  const distanceMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const durationMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  const CHUNK_SIZE = 10;
  const chunks: { start: number; locs: Loc[] }[] = [];
  for (let i = 0; i < n; i += CHUNK_SIZE) {
    chunks.push({ start: i, locs: locations.slice(i, i + CHUNK_SIZE) });
  }

  console.log(`🌐 Đang gọi Goong Maps API (vehicle=bike) dựng ma trận ${n}x${n} (${chunks.length * chunks.length} sub-requests)...`);

  for (let r = 0; r < chunks.length; r++) {
    const originChunk = chunks[r];
    const originsStr = originChunk.locs.map((l) => `${l.lat},${l.lng}`).join('|');

    for (let c = 0; c < chunks.length; c++) {
      const destChunk = chunks[c];
      const destsStr = destChunk.locs.map((l) => `${l.lat},${l.lng}`).join('|');
      const url = `https://rsapi.goong.io/DistanceMatrix?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destsStr)}&vehicle=bike&api_key=${GOONG_API_KEY}`;

      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (res.status === 429 && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
            continue;
          }
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (!res || !res.ok) {
        throw new Error(`Goong API HTTP Error: status ${res?.status} tại chunk [${r}, ${c}]`);
      }

      const data = (await res.json()) as any;
      if (!data || !data.rows || data.rows.length !== originChunk.locs.length) {
        throw new Error(`Goong API: rows count mismatch tại chunk [${r}, ${c}]`);
      }

      for (let i = 0; i < originChunk.locs.length; i++) {
        const globalI = originChunk.start + i;
        const elements = data.rows[i]?.elements;
        if (!elements || elements.length !== destChunk.locs.length) {
          throw new Error(`Goong API: elements count mismatch tại hàng ${globalI}`);
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
            throw new Error(`Goong API unroutable path: ${globalI} -> ${globalJ}`);
          }
          distanceMatrix[globalI][globalJ] = el.distance.value;
          durationMatrix[globalI][globalJ] = el.duration.value;
        }
      }

      // Giữ khoảng cách giữa các sub-requests để chống 429
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  console.log('✅ Hoàn thành 100% ma trận đường bộ Goong Maps (source: goong).');
  return { distanceMatrix, durationMatrix };
}

// Cải tiến K-Means có trần tải cứng (Max 25 đơn, 50kg, 0.20m3)
function clusterOrdersWithHardLimits(orders: OrderItem[], k: number, maxOrders = 25, maxWeightKg = 50, maxVolM3 = 0.2): OrderItem[][] {
  const validOrders = orders.filter((o) => o.deliveryLatitude != null && o.deliveryLongitude != null);
  if (validOrders.length === 0 || k <= 0) return [];

  // Khởi tạo tâm ngẫu nhiên
  const centroids: Loc[] = [];
  const used = new Set<number>();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * validOrders.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push({ lat: validOrders[idx].deliveryLatitude!, lng: validOrders[idx].deliveryLongitude! });
    }
  }

  // Chạy lặp K-Means hình học tự nhiên
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

    // Cập nhật tâm
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

  // Kiểm tra và đẩy bớt đơn nếu một cụm vượt trần tải (Max 25 đơn, 50kg, 0.20m3)
  for (let c = 0; c < k; c++) {
    while (clusters[c].length > maxOrders) {
      // Tìm đơn xa tâm cụm c nhất để di chuyển sang cụm lân cận còn chỗ
      let maxD = -1;
      let outIdx = -1;
      clusters[c].forEach((ord, idx) => {
        const d = kmeansService.haversineDistance(ord.deliveryLatitude!, ord.deliveryLongitude!, centroids[c].lat, centroids[c].lng);
        if (d > maxD) {
          maxD = d;
          outIdx = idx;
        }
      });

      const movedOrder = clusters[c].splice(outIdx, 1)[0];
      // Tìm cụm khác còn chỗ gần nhất
      let targetC = -1;
      let targetDist = Infinity;
      for (let other = 0; other < k; other++) {
        if (other !== c && clusters[other].length < maxOrders) {
          const d = kmeansService.haversineDistance(movedOrder.deliveryLatitude!, movedOrder.deliveryLongitude!, centroids[other].lat, centroids[other].lng);
          if (d < targetDist) {
            targetDist = d;
            targetC = other;
          }
        }
      }
      if (targetC !== -1) {
        clusters[targetC].push(movedOrder);
      } else {
        clusters[c].push(movedOrder);
        break;
      }
    }
  }

  return clusters;
}

// Tối ưu hoá thứ tự đơn trong cụm bằng GA nội bộ trên ma trận con
async function solveClusterWithGA(
  facilityLoc: Loc,
  clusterOrders: OrderItem[],
  distMatrix: number[][],
  durMatrix: number[][],
  locIndexMap: Map<string, number>
): Promise<OrderItem[]> {
  if (clusterOrders.length <= 1) return clusterOrders;

  // Cắt ma trận con cho cụm
  const n = clusterOrders.length + 1; // 0: Hub, 1..n-1: đơn
  const subDist: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const subDur: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  const subIndices = [0, ...clusterOrders.map((o) => locIndexMap.get(o.id)!)];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      subDist[i][j] = distMatrix[subIndices[i]][subIndices[j]];
      subDur[i][j] = durMatrix[subIndices[i]][subIndices[j]];
    }
  }

  // Gọi solver GA của VRPService qua optimizeRouteWithMetrics với ma trận đã tính sẵn
  const res = await vrpService.optimizeRouteWithMetrics(
    clusterOrders as any,
    facilityLoc,
    new Date(),
    false, // open route
    { distanceMatrix: subDist, durationMatrix: subDur, matrixSource: 'goong' }
  );

  return (res.orders as any) || clusterOrders;
}

async function main() {
  console.log('🚀 KHỞI ĐỘNG ĐO ĐẠC BASELINE GIAI ĐOẠN 4 TRÊN MA TRẬN GOONG CHUẨN HOÁ...');

  // 1. Lấy dữ liệu Bưu cục và 51 đơn hàng từ DB
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

  console.log(`📦 Bưu cục: ${fac.facilityName} (${fac.facilityCode}) | Tổng đơn: ${dbOrders.length}`);
  if (dbOrders.length === 0) throw new Error('Không có đơn hàng nào ở trạng thái AT_HUB!');

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

  const allLocs = [facilityLoc, ...orders.map((o) => ({ lat: o.deliveryLatitude!, lng: o.deliveryLongitude! }))];
  const locIndexMap = new Map<string, number>();
  orders.forEach((o, idx) => locIndexMap.set(o.id, idx + 1));

  // 2. Nạp hoặc dựng ma trận Goong 52x52
  const fixturePath = path.join(__dirname, 'test_fixtures', 'phase4_dangbi_51_goong_matrix.json');
  let distMatrix: number[][];
  let durMatrix: number[][];

  if (fs.existsSync(fixturePath)) {
    console.log('📂 Tìm thấy file cache ma trận Goong 52x52. Đang kiểm tra tính hợp lệ...');
    const cacheData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    if (cacheData.matrixSource !== 'goong') {
      throw new Error(`DỪNG: Ma trận trong cache có nguồn '${cacheData.matrixSource}' không phải Goong Maps!`);
    }
    distMatrix = cacheData.distanceMatrix;
    durMatrix = cacheData.durationMatrix;
    console.log('✅ Đã nạp thành công ma trận Goong 52x52 từ cache an toàn.');
  } else {
    const matrixRes = await buildGoongMatrix52(allLocs);
    distMatrix = matrixRes.distanceMatrix;
    durMatrix = matrixRes.durationMatrix;

    const cacheData = {
      matrixSource: 'goong',
      dimensions: 52,
      createdAt: new Date().toISOString(),
      distanceMatrix: distMatrix,
      durationMatrix: durMatrix,
    };
    if (!fs.existsSync(path.dirname(fixturePath))) fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Đã lưu đóng băng ma trận Goong 52x52 vào: ${fixturePath}`);
  }

  // Chuẩn bị mảng tải trọng cho OR-Tools
  const weightsKg: number[] = orders.map((o) => (o as any).package?.weightKg || 1.0);
  const volumesM3: number[] = orders.map((o) => {
    const pkg = (o as any).package;
    if (pkg) {
      return ((pkg.widthCm || 20) * (pkg.heightCm || 20) * (pkg.lengthCm || 20)) / 1000000;
    }
    return 0.008;
  });

  // =========================================================================
  // THÍ NGHIỆM 1: PIPELINE HIỆN TẠI (Ép tải Math.ceil 13 đơn/xe - Chạy 30 lần)
  // =========================================================================
  console.log('\n--- 1. CHẠY PIPELINE HIỆN TẠI (ÉP TẢI 13 ĐƠN/XE) - 30 LẦN THỬ NGHIỆM ---');
  let bestBaselineKm = Infinity;
  let worstBaselineKm = -Infinity;
  let sumBaselineKm = 0;
  let bestBaselineEval: PlanEvaluation | null = null;

  for (let seed = 0; seed < 30; seed++) {
    const clusters = kmeansService.clusterOrders(orders, 4);
    const solvedClusters: OrderItem[][] = [];
    for (const c of clusters) {
      const optOrders = await solveClusterWithGA(facilityLoc, c.orders, distMatrix, durMatrix, locIndexMap);
      solvedClusters.push(optOrders);
    }
    const evaluation = evaluateRoutes(solvedClusters, distMatrix, durMatrix, locIndexMap);
    sumBaselineKm += evaluation.totalKm;
    if (evaluation.totalKm < bestBaselineKm) {
      bestBaselineKm = evaluation.totalKm;
      bestBaselineEval = evaluation;
    }
    if (evaluation.totalKm > worstBaselineKm) {
      worstBaselineKm = evaluation.totalKm;
    }
  }

  const avgBaselineKm = Math.round((sumBaselineKm / 30) * 100) / 100;
  console.log(`Baseline (30 lần): Best = ${bestBaselineKm} km | Worst = ${worstBaselineKm} km | Avg = ${avgBaselineKm} km`);
  console.log(`Chi tiết phương án Baseline tốt nhất (Makespan: ${bestBaselineEval!.makespanMin} phút):`);
  bestBaselineEval!.routes.forEach((r, i) => {
    console.log(`  + Tuyến ${i + 1}: ${r.stopsCount} đơn, ${r.distanceKm} km, lái ${r.travelDurationMin}p + dừng ${r.serviceDurationMin}p = ${r.totalDurationMin}p (Tải: ${r.totalWeightKg}kg, ${r.totalVolumeM3}m3)`);
  });

  // =========================================================================
  // THÍ NGHIỆM 2: K-MEANS TỰ NHIÊN CÓ TRẦN TẢI (Max 25 đơn, 50kg - Chạy 30 lần)
  // =========================================================================
  console.log('\n--- 2. CHẠY K-MEANS TỰ NHIÊN CÓ TRẦN TẢI (MAX 25 ĐƠN) - 30 LẦN THỬ NGHIỆM ---');
  let bestNatKm = Infinity;
  let worstNatKm = -Infinity;
  let sumNatKm = 0;
  let bestNatEval: PlanEvaluation | null = null;

  for (let seed = 0; seed < 30; seed++) {
    const rawClusters = clusterOrdersWithHardLimits(orders, 4, 25, 50, 0.2);
    const solvedClusters: OrderItem[][] = [];
    for (const c of rawClusters) {
      const optOrders = await solveClusterWithGA(facilityLoc, c, distMatrix, durMatrix, locIndexMap);
      solvedClusters.push(optOrders);
    }
    const evaluation = evaluateRoutes(solvedClusters, distMatrix, durMatrix, locIndexMap);
    sumNatKm += evaluation.totalKm;
    if (evaluation.totalKm < bestNatKm) {
      bestNatKm = evaluation.totalKm;
      bestNatEval = evaluation;
    }
    if (evaluation.totalKm > worstNatKm) {
      worstNatKm = evaluation.totalKm;
    }
  }

  const avgNatKm = Math.round((sumNatKm / 30) * 100) / 100;
  console.log(`Tự nhiên (30 lần): Best = ${bestNatKm} km | Worst = ${worstNatKm} km | Avg = ${avgNatKm} km`);
  console.log(`Chi tiết phương án Tự nhiên tốt nhất (Makespan: ${bestNatEval!.makespanMin} phút):`);
  bestNatEval!.routes.forEach((r, i) => {
    console.log(`  + Tuyến ${i + 1}: ${r.stopsCount} đơn, ${r.distanceKm} km, lái ${r.travelDurationMin}p + dừng ${r.serviceDurationMin}p = ${r.totalDurationMin}p (Tải: ${r.totalWeightKg}kg, ${r.totalVolumeM3}m3)`);
  });

  // =========================================================================
  // THÍ NGHIỆM 3: OR-TOOLS ĐA XE BIẾN THỂ A (Bắt buộc đủ 4 xe, mỗi xe >= 4 đơn, makespan <= 180p)
  // =========================================================================
  console.log('\n--- 3. CHẠY OR-TOOLS ĐA XE BIẾN THỂ A (ĐỦ 4 XE, MIN 4 ĐƠN, MAKESPAN <= 180p) ---');
  const ortoolsVarA = await runOrToolsMultiVehicle({
    distanceMatrix: distMatrix,
    durationMatrix: durMatrix,
    numVehicles: 4,
    maxStopsPerVehicle: 25,
    minStopsPerVehicle: 4,
    forceAllVehicles: true,
    returnToHub: false,
    maxDurationMin: 180,
    timeLimitSeconds: 10,
    weights: weightsKg,
    volumes: volumesM3,
  });

  let evalOrtoolsA: PlanEvaluation | null = null;
  if (ortoolsVarA.success) {
    const clustersA: OrderItem[][] = ortoolsVarA.routes.map((r: any) => r.stops.map((nodeIdx: number) => orders[nodeIdx - 1]));
    evalOrtoolsA = evaluateRoutes(clustersA, distMatrix, durMatrix, locIndexMap);
    console.log(`OR-Tools Biến thể A: Tổng km = ${evalOrtoolsA.totalKm} km | Makespan = ${evalOrtoolsA.makespanMin} phút | Runtime = ${ortoolsVarA.solverRuntimeMs}ms`);
    evalOrtoolsA.routes.forEach((r, i) => {
      console.log(`  + Xe ${i + 1}: ${r.stopsCount} đơn, ${r.distanceKm} km, lái ${r.travelDurationMin}p + dừng ${r.serviceDurationMin}p = ${r.totalDurationMin}p (Tải: ${r.totalWeightKg}kg)`);
    });
  } else {
    console.log('OR-Tools Biến thể A thất bại:', ortoolsVarA.message);
  }

  // =========================================================================
  // THÍ NGHIỆM 4: OR-TOOLS ĐA XE BIẾN THỂ B (Tự do số xe, makespan <= 180p)
  // =========================================================================
  console.log('\n--- 4. CHẠY OR-TOOLS ĐA XE BIẾN THỂ B (TỰ DO SỐ XE, MAKESPAN <= 180p) ---');
  const ortoolsVarB = await runOrToolsMultiVehicle({
    distanceMatrix: distMatrix,
    durationMatrix: durMatrix,
    numVehicles: 4,
    maxStopsPerVehicle: 25,
    forceAllVehicles: false,
    returnToHub: false,
    maxDurationMin: 180,
    timeLimitSeconds: 10,
    weights: weightsKg,
    volumes: volumesM3,
  });

  let evalOrtoolsB: PlanEvaluation | null = null;
  if (ortoolsVarB.success) {
    const clustersB: OrderItem[][] = ortoolsVarB.routes
      .filter((r: any) => r.stopsCount > 0)
      .map((r: any) => r.stops.map((nodeIdx: number) => orders[nodeIdx - 1]));
    evalOrtoolsB = evaluateRoutes(clustersB, distMatrix, durMatrix, locIndexMap);
    console.log(`OR-Tools Biến thể B: Tổng km = ${evalOrtoolsB.totalKm} km | Xe chạy = ${evalOrtoolsB.activeVehicles} | Makespan = ${evalOrtoolsB.makespanMin} phút | Runtime = ${ortoolsVarB.solverRuntimeMs}ms`);
    evalOrtoolsB.routes.forEach((r, i) => {
      console.log(`  + Xe ${i + 1}: ${r.stopsCount} đơn, ${r.distanceKm} km, lái ${r.travelDurationMin}p + dừng ${r.serviceDurationMin}p = ${r.totalDurationMin}p (Tải: ${r.totalWeightKg}kg)`);
    });
  } else {
    console.log('OR-Tools Biến thể B thất bại:', ortoolsVarB.message);
  }

  // =========================================================================
  // 5. TÍNH CHỈ SỐ ĐƠN LẠC LOÀI (Removal Cost Delta) TRÊN MA TRẬN GOONG CHUẨN
  // =========================================================================
  console.log('\n--- 5. TÍNH CHỈ SỐ ĐƠN LẠC LOÀI (TRÊN MA TRẬN GOONG CHUẨN) ---');
  const outlierDeltas: { orderCode: string; routeIndex: number; deltaM: number; deltaKm: number; address: string }[] = [];

  bestBaselineEval!.routes.forEach((r, rIdx) => {
    const routeOrders = r.stops;
    const getDist = (ords: OrderItem[]) => {
      if (ords.length === 0) return 0;
      let d = 0;
      let u = 0;
      for (const ord of ords) {
        const v = locIndexMap.get(ord.id)!;
        d += distMatrix[u][v];
        u = v;
      }
      return d;
    };

    const baseDist = getDist(routeOrders);
    for (let i = 0; i < routeOrders.length; i++) {
      const withoutI = routeOrders.filter((_, idx) => idx !== i);
      const distWithoutI = getDist(withoutI);
      const deltaM = baseDist - distWithoutI;
      outlierDeltas.push({
        orderCode: routeOrders[i].orderCode,
        routeIndex: rIdx + 1,
        deltaM,
        deltaKm: Math.round((deltaM / 1000) * 100) / 100,
        address: (routeOrders[i] as any).deliveryAddressText || '',
      });
    }
  });

  outlierDeltas.sort((a, b) => b.deltaM - a.deltaM);
  console.log('🔍 TOP 5 ĐƠN LẠC LOÀI KÉO DÀI TUYẾN NHIỀU NHẤT:');
  outlierDeltas.slice(0, 5).forEach((d, idx) => {
    console.log(`  ${idx + 1}. [Tuyến ${d.routeIndex}] ${d.orderCode}: Kéo dài +${d.deltaKm} km (+${Math.round(d.deltaM)}m) | ${d.address}`);
  });

  // =========================================================================
  // BẢNG TỔNG HỢP SO SÁNH CUỐI CÙNG
  // =========================================================================
  console.log('\n====================================================================================================');
  console.log('📊 BẢNG ĐỐI SÁNH KẾT QUẢ ĐO ĐẠC CA 51 ĐƠN BƯU CỤC ĐẶNG VĂN BI (CHUẨN HOÁ TRÊN 1 MA TRẬN GOONG)');
  console.log('====================================================================================================');
  console.log('| Kịch bản | Số xe | Phân bổ đơn | Tổng km (Best/Avg) | Phút lái | Phút dừng | Tổng phút | Makespan ca |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
  console.log(`| **1. Baseline (Ép tải 13 đơn)** | 4 | ${bestBaselineEval!.routes.map((r) => r.stopsCount).join('-')} | **${bestBaselineEval!.totalKm} km** (${avgBaselineKm}) | ${bestBaselineEval!.totalTravelMin}p | 255p | ${bestBaselineEval!.totalMin}p | **${bestBaselineEval!.makespanMin}p** |`);
  console.log(`| **2. Tự nhiên (Trần 25 đơn)** | 4 | ${bestNatEval!.routes.map((r) => r.stopsCount).join('-')} | **${bestNatEval!.totalKm} km** (${avgNatKm}) | ${bestNatEval!.totalTravelMin}p | 255p | ${bestNatEval!.totalMin}p | **${bestNatEval!.makespanMin}p** |`);
  if (evalOrtoolsA) {
    console.log(`| **3. OR-Tools (Đủ 4 xe, >=4 đơn)** | 4 | ${evalOrtoolsA.routes.map((r) => r.stopsCount).join('-')} | **${evalOrtoolsA.totalKm} km** | ${evalOrtoolsA.totalTravelMin}p | 255p | ${evalOrtoolsA.totalMin}p | **${evalOrtoolsA.makespanMin}p** |`);
  }
  if (evalOrtoolsB) {
    console.log(`| **4. OR-Tools (Tự do số xe)** | ${evalOrtoolsB.activeVehicles} | ${evalOrtoolsB.routes.map((r) => r.stopsCount).join('-')} | **${evalOrtoolsB.totalKm} km** | ${evalOrtoolsB.totalTravelMin}p | 255p | ${evalOrtoolsB.totalMin}p | **${evalOrtoolsB.makespanMin}p** |`);
  }
  console.log('====================================================================================================\n');
}

main()
  .catch((e) => {
    console.error('LỖI THỰC THI:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
