import fs from 'fs';
import path from 'path';
import { VRPService } from '../services/routing/vrp.service';
import { evaluateRoute, RouteEvaluationResult } from './routing_evaluator';
import { solveExactOptimum, EXACT_MAX_STOPS } from './optimum_reference';

// 1. Tọa độ Bưu cục Đặng Văn Bi - TP. Thủ Đức (FAC-TD-DANGBI)
const FACILITY_LOCATION = {
  id: 'FAC-TD-DANGBI',
  name: 'Bưu cục Đặng Văn Bi - TP. Thủ Đức',
  lat: 10.8495,
  lng: 106.7625,
};

// 2. 50 Điểm giao hàng thực tế trong bán kính phục vụ của Bưu cục Đặng Văn Bi
const THUDUC_DELIVERY_POINTS = [
  // Cụm 1: Võ Văn Ngân & Linh Chiểu (Bình Thọ, Linh Chiểu) - Khoảng cách: 0.5 - 1.5 km
  { id: 1, name: 'Nguyễn Văn An', addr: '20 Võ Văn Ngân, Bình Thọ', lat: 10.8505, lng: 106.7660 },
  { id: 2, name: 'Trần Thị Bích', addr: '45 Võ Văn Ngân, Bình Thọ', lat: 10.8512, lng: 106.7680 },
  { id: 3, name: 'Lê Hoàng Cường', addr: '78 Võ Văn Ngân, Linh Chiểu', lat: 10.8525, lng: 106.7705 },
  { id: 4, name: 'Phạm Thị Dung', addr: '112 Võ Văn Ngân, Linh Chiểu', lat: 10.8538, lng: 106.7725 },
  { id: 5, name: 'Hoàng Văn Em', addr: '150 Võ Văn Ngân, Linh Chiểu', lat: 10.8550, lng: 106.7745 },
  { id: 6, name: 'Ngô Quốc Giang', addr: '15 Thống Nhất, Bình Thọ', lat: 10.8480, lng: 106.7650 },
  { id: 7, name: 'Đặng Mai Hoa', addr: '38 Thống Nhất, Bình Thọ', lat: 10.8465, lng: 106.7675 },
  { id: 8, name: 'Bùi Thế Hùng', addr: '72 Thống Nhất, Bình Thọ', lat: 10.8450, lng: 106.7700 },
  { id: 9, name: 'Vũ Thị Kim', addr: '22 Bác Ái, Bình Thọ', lat: 10.8485, lng: 106.7670 },
  { id: 10, name: 'Đỗ Văn Long', addr: '45 Bác Ái, Bình Thọ', lat: 10.8470, lng: 106.7690 },

  // Cụm 2: Đặng Văn Bi & Dân Chủ (Bình Thọ, Trường Thọ) - Khoảng cách: 0.3 - 2.0 km
  { id: 11, name: 'Hồ Thị Mai', addr: '120 Đặng Văn Bi, Bình Thọ', lat: 10.8490, lng: 106.7610 },
  { id: 12, name: 'Lý Hải Nam', addr: '85 Đặng Văn Bi, Bình Thọ', lat: 10.8480, lng: 106.7595 },
  { id: 13, name: 'Dương Thị Nga', addr: '40 Đặng Văn Bi, Trường Thọ', lat: 10.8465, lng: 106.7570 },
  { id: 14, name: 'Trịnh Quốc Oanh', addr: '15 Đặng Văn Bi, Trường Thọ', lat: 10.8450, lng: 106.7550 },
  { id: 15, name: 'Mai Văn Phúc', addr: '18 Dân Chủ, Bình Thọ', lat: 10.8510, lng: 106.7635 },
  { id: 16, name: 'Cao Thị Quỳnh', addr: '55 Dân Chủ, Bình Thọ', lat: 10.8525, lng: 106.7650 },
  { id: 17, name: 'Tôn Thất Sơn', addr: '92 Dân Chủ, Bình Thọ', lat: 10.8540, lng: 106.7665 },
  { id: 18, name: 'Phan Thị Tâm', addr: '25 Khổng Tử, Bình Thọ', lat: 10.8500, lng: 106.7640 },
  { id: 19, name: 'Lê Văn Uy', addr: '50 Khổng Tử, Bình Thọ', lat: 10.8515, lng: 106.7655 },
  { id: 20, name: 'Nguyễn Thị Vân', addr: '85 Khổng Tử, Bình Thọ', lat: 10.8530, lng: 106.7670 },

  // Cụm 3: Kha Vạn Cân & Hoàng Diệu 2 (Linh Chiểu, Linh Trung) - Khoảng cách: 1.0 - 2.5 km
  { id: 21, name: 'Vũ Đức Xuân', addr: '25 Hoàng Diệu 2, Linh Chiểu', lat: 10.8535, lng: 106.7690 },
  { id: 22, name: 'Đặng Kim Yến', addr: '65 Hoàng Diệu 2, Linh Chiểu', lat: 10.8545, lng: 106.7710 },
  { id: 23, name: 'Hoàng Minh Anh', addr: '105 Hoàng Diệu 2, Linh Trung', lat: 10.8558, lng: 106.7735 },
  { id: 24, name: 'Trần Bảo Bảo', addr: '145 Hoàng Diệu 2, Linh Trung', lat: 10.8570, lng: 106.7760 },
  { id: 25, name: 'Lê Cẩm Chi', addr: '185 Hoàng Diệu 2, Linh Trung', lat: 10.8582, lng: 106.7785 },
  { id: 26, name: 'Phạm Danh Duy', addr: '780 Kha Vạn Cân, Linh Chiểu', lat: 10.8505, lng: 106.7625 },
  { id: 27, name: 'Nguyễn Tiến Đạt', addr: '850 Kha Vạn Cân, Linh Chiểu', lat: 10.8518, lng: 106.7640 },
  { id: 28, name: 'Trần Kim Ngân', addr: '910 Kha Vạn Cân, Trường Thọ', lat: 10.8530, lng: 106.7655 },
  { id: 29, name: 'Bùi Minh Quân', addr: '960 Kha Vạn Cân, Trường Thọ', lat: 10.8542, lng: 106.7670 },
  { id: 30, name: 'Phạm Thu Trang', addr: '1020 Kha Vạn Cân, Linh Trung', lat: 10.8555, lng: 106.7685 },

  // Cụm 4: Lê Văn Việt & Phước Long B - Khoảng cách: 2.0 - 3.5 km
  { id: 31, name: 'Võ Hoàng Nam', addr: '15 Lê Văn Việt, Hiệp Phú', lat: 10.8450, lng: 106.7790 },
  { id: 32, name: 'Nguyễn Thanh Hương', addr: '60 Lê Văn Việt, Hiệp Phú', lat: 10.8462, lng: 106.7805 },
  { id: 33, name: 'Đặng Văn Khoa', addr: '110 Lê Văn Việt, Tăng Nhơn Phú A', lat: 10.8475, lng: 106.7820 },
  { id: 34, name: 'Bùi Ngọc Hà', addr: '150 Lê Văn Việt, Tăng Nhơn Phú A', lat: 10.8488, lng: 106.7835 },
  { id: 35, name: 'Bùi Văn Lộc', addr: '200 Lê Văn Việt, Tăng Nhơn Phú A', lat: 10.8500, lng: 106.7850 },
  { id: 36, name: 'Trịnh Mai Anh', addr: '25 Đường số 3, Phước Long B', lat: 10.8300, lng: 106.7620 },
  { id: 37, name: 'Ngô Hữu Thắng', addr: '48 Đường số 5, Phước Long B', lat: 10.8320, lng: 106.7640 },
  { id: 38, name: 'Đỗ Mỹ Linh', addr: '90 Đường Tăng Nhơn Phú, Phước Long B', lat: 10.8350, lng: 106.7680 },
  { id: 39, name: 'Hồ Văn Đức', addr: '120 Tăng Nhơn Phú, Tăng Nhơn Phú B', lat: 10.8380, lng: 106.7710 },
  { id: 40, name: 'Lê Thị Hoài', addr: '150 Tăng Nhơn Phú, Tăng Nhơn Phú B', lat: 10.8400, lng: 106.7730 },

  // Cụm 5: Đỗ Xuân Hợp & Tây Hòa - Khoảng cách: 2.5 - 4.0 km
  { id: 41, name: 'Nguyễn Văn Thành', addr: '100 Đỗ Xuân Hợp, Phước Long B', lat: 10.8260, lng: 106.7610 },
  { id: 42, name: 'Đặng Thu Thủy', addr: '160 Đỗ Xuân Hợp, Phước Long B', lat: 10.8280, lng: 106.7630 },
  { id: 43, name: 'Trần Văn Phát', addr: '210 Đỗ Xuân Hợp, Phước Long B', lat: 10.8300, lng: 106.7650 },
  { id: 44, name: 'Bùi Thảo Vân', addr: '270 Đỗ Xuân Hợp, Phước Long B', lat: 10.8320, lng: 106.7670 },
  { id: 45, name: 'Bùi Tiến Dũng', addr: '320 Đỗ Xuân Hợp, Phước Long A', lat: 10.8340, lng: 106.7690 },
  { id: 46, name: 'Nguyễn Phương Anh', addr: '15 Đường Tây Hòa, Phước Long A', lat: 10.8270, lng: 106.7580 },
  { id: 47, name: 'Đỗ Văn Hải', addr: '45 Đường Tây Hòa, Phước Long A', lat: 10.8285, lng: 106.7595 },
  { id: 48, name: 'Bùi Khánh Vân', addr: '80 Đường Tây Hòa, Phước Long A', lat: 10.8300, lng: 106.7610 },
  { id: 49, name: 'Hoàng Văn Nam', addr: '110 Đường Nam Hòa, Phước Long A', lat: 10.8255, lng: 106.7570 },
  { id: 50, name: 'Lê Thị Thanh', addr: '140 Đường Nam Hòa, Phước Long A', lat: 10.8265, lng: 106.7585 },
];

interface BenchmarkScenario {
  id: string;
  name: string;
  orderCount: number;
  tightDeadlineRatio: number; // 0.0, 0.3, 0.7
  pointIndices: number[]; // Index 1..50
  tightIndices?: number[]; // Specific indices with tight deadlines
}

/**
 * 15 Kịch bản Benchmark chuẩn trên cùng địa bàn Bưu cục Đặng Văn Bi
 */
const SCENARIOS: BenchmarkScenario[] = [
  // Nhỏ (6 đơn): 0%, 33%, 66% đơn gấp
  { id: 'SC-01', name: 'Nhỏ (6 đơn) - Không có hẹn giờ', orderCount: 6, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 6, 7, 11, 15] },
  { id: 'SC-02', name: 'Nhỏ (6 đơn) - 33% hẹn giờ gấp', orderCount: 6, tightDeadlineRatio: 0.33, pointIndices: [1, 3, 5, 12, 16, 21] },
  { id: 'SC-03', name: 'Nhỏ (6 đơn) - 66% hẹn giờ gấp', orderCount: 6, tightDeadlineRatio: 0.66, pointIndices: [2, 4, 8, 14, 18, 22] },

  // Trung bình nhỏ (10 đơn): 0%, 30%, 70% đơn gấp
  { id: 'SC-04', name: 'Vừa (10 đơn) - Không có hẹn giờ', orderCount: 10, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 6, 7, 11, 12, 15, 16, 21] },
  { id: 'SC-05', name: 'Vừa (10 đơn) - 30% hẹn giờ gấp', orderCount: 10, tightDeadlineRatio: 0.3, pointIndices: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28] },
  { id: 'SC-06', name: 'Vừa (10 đơn) - 70% hẹn giờ gấp', orderCount: 10, tightDeadlineRatio: 0.7, pointIndices: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29] },

  // Trung bình (15 đơn): 0%, 27%, 67% đơn gấp
  { id: 'SC-07', name: 'Trung bình (15 đơn) - Không có hẹn giờ', orderCount: 15, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 4, 6, 7, 8, 11, 12, 13, 15, 16, 17, 21, 22] },
  { id: 'SC-08', name: 'Trung bình (15 đơn) - 27% hẹn giờ gấp', orderCount: 15, tightDeadlineRatio: 0.27, pointIndices: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29] },
  { id: 'SC-09', name: 'Trung bình (15 đơn) - 67% hẹn giờ gấp', orderCount: 15, tightDeadlineRatio: 0.67, pointIndices: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30] },

  // Đầy tải (20 đơn): 0%, 30%, 65% đơn gấp
  { id: 'SC-10', name: 'Đầy tải (20 đơn) - Không có hẹn giờ', orderCount: 20, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { id: 'SC-11', name: 'Đầy tải (20 đơn) - 30% hẹn giờ gấp', orderCount: 20, tightDeadlineRatio: 0.3, pointIndices: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39] },
  { id: 'SC-12', name: 'Đầy tải (20 đơn) - 65% hẹn giờ gấp', orderCount: 20, tightDeadlineRatio: 0.65, pointIndices: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40] },

  // Cực đại (25 đơn): Phủ nhiều cụm phường trong bán kính bưu cục
  { id: 'SC-13', name: 'Cực đại (25 đơn) - 0% hẹn giờ', orderCount: 25, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47] },
  { id: 'SC-14', name: 'Cực đại (25 đơn) - 32% hẹn giờ', orderCount: 25, tightDeadlineRatio: 0.32, pointIndices: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48] },

  // Kịch bản Ca Lỗi Thực Tế (Case-Study): 10 đơn dọc trục Võ Văn Ngân, nhưng đơn số 10 ở xa tít có hẹn gấp
  {
    id: 'SC-15-CASE-STUDY',
    name: 'Ca lỗi thực tế (10 đơn) - 1 đơn rìa có deadline gấp',
    orderCount: 10,
    tightDeadlineRatio: 0.1,
    pointIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 31], // 9 đơn gần (Võ Văn Ngân) + 1 đơn xa (31: Lê Văn Việt)
    tightIndices: [31], // Đơn 31 bị ép deadline sớm 30 phút!
  },
];

/**
 * Tính khoảng cách Haversine (km) giữa 2 điểm
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Đóng băng và nạp ma trận cự ly (Frozen Matrix Cache)
 */
function getOrBuildMatrixCache(): { distanceMatrix: number[][]; durationMatrix: number[][] } {
  const cachePath = path.join(__dirname, 'test_fixtures', 'thuduc_matrix_cache.json');

  if (fs.existsSync(cachePath)) {
    console.log('📦 [Benchmark] Đã nạp Ma trận cự ly đóng băng từ file cache JSON!');
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }

  console.log('⚙️ [Benchmark] Tạo mới Ma trận cự ly đóng băng (51x51 điểm tại Thủ Đức)...');
  const allNodes = [FACILITY_LOCATION, ...THUDUC_DELIVERY_POINTS];
  const N = allNodes.length; // 51 nodes (0 là bưu cục, 1..50 là đơn)

  const distanceMatrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const durationMatrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

  // Tốc độ di chuyển xe máy đô thị: trung bình 25 km/h trong ngõ ngách, hệ số quanh co đường sá = 1.35
  const urbanSpeedMPS = (25 * 1000) / 3600; // ~6.94 m/s
  const roadTortuosity = 1.35; // Hệ số uốn lượn của mạng lưới đường phố Việt Nam so với đường chim bay

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        distanceMatrix[i][j] = 0;
        durationMatrix[i][j] = 0;
      } else {
        const straightKm = haversineDistance(allNodes[i].lat, allNodes[i].lng, allNodes[j].lat, allNodes[j].lng);
        const actualMeters = Math.round(straightKm * 1000 * roadTortuosity);
        const durationSec = Math.round(actualMeters / urbanSpeedMPS);

        distanceMatrix[i][j] = actualMeters;
        durationMatrix[i][j] = durationSec;
      }
    }
  }

  const cacheData = { distanceMatrix, durationMatrix };
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
  console.log(`✅ [Benchmark] Đã lưu ma trận cự ly thành công vào ${cachePath}`);
  return cacheData;
}

/**
 * Thuật toán cơ sở Nearest Neighbor (Tham lam chọn điểm gần nhất tiếp theo)
 */
function solveNearestNeighbor(scenarioDistMatrix: number[][]): number[] {
  const n = scenarioDistMatrix.length - 1; // Số điểm dừng
  const unvisited = new Set<number>();
  for (let i = 1; i <= n; i++) unvisited.add(i);

  const route: number[] = [];
  let curr = 0; // Xuất phát từ kho (0)

  while (unvisited.size > 0) {
    let nearest = -1;
    let minDist = Infinity;

    for (const cand of unvisited) {
      const d = scenarioDistMatrix[curr][cand];
      if (d < minDist) {
        minDist = d;
        nearest = cand;
      }
    }

    route.push(nearest);
    unvisited.delete(nearest);
    curr = nearest;
  }

  return route;
}

async function runBenchmark() {
  console.log('========================================================================================');
  console.log('🚀 BẮT ĐẦU CHẠY BENCHMARK ĐỊNH TUYẾN GIAO HÀNG (BƯU CỤC ĐẶNG VĂN BI - TP. THỦ ĐỨC)');
  console.log('========================================================================================\n');

  const { distanceMatrix: globalDist, durationMatrix: globalDur } = getOrBuildMatrixCache();
  const vrpService = new VRPService();
  const startTime = new Date('2026-10-12T08:00:00Z');

  const results: any[] = [];

  for (const sc of SCENARIOS) {
    const nodeCount = sc.pointIndices.length;
    // Map scenario nodes: index 0 là bưu cục, 1..N là các điểm giao
    const scenarioNodes = [FACILITY_LOCATION, ...sc.pointIndices.map((idx) => THUDUC_DELIVERY_POINTS[idx - 1])];

    // Trích xuất ma trận con cho kịch bản này
    const subDist: number[][] = Array.from({ length: nodeCount + 1 }, () => new Array(nodeCount + 1).fill(0));
    const subDur: number[][] = Array.from({ length: nodeCount + 1 }, () => new Array(nodeCount + 1).fill(0));

    const globalIndices = [0, ...sc.pointIndices];
    for (let i = 0; i <= nodeCount; i++) {
      for (let j = 0; j <= nodeCount; j++) {
        subDist[i][j] = globalDist[globalIndices[i]][globalIndices[j]];
        subDur[i][j] = globalDur[globalIndices[i]][globalIndices[j]];
      }
    }

    // Thiết lập deadline (estimatedDeliveryDate) cho từng đơn
    const deadlines: (Date | null)[] = [];
    const tightCount = Math.round(nodeCount * sc.tightDeadlineRatio);

    for (let i = 1; i <= nodeCount; i++) {
      const originalPointId = sc.pointIndices[i - 1];
      const isSpecificTight = sc.tightIndices && sc.tightIndices.includes(originalPointId);

      if (isSpecificTight || (!sc.tightIndices && i <= tightCount)) {
        // Deadline gấp: trong vòng 45 - 90 phút sau khi xuất phát
        const tightMinutes = 35 + (i % 3) * 20;
        deadlines.push(new Date(startTime.getTime() + tightMinutes * 60 * 1000));
      } else {
        // Deadline thoáng hoặc không có: 4 - 6 tiếng sau
        deadlines.push(new Date(startTime.getTime() + 4 * 60 * 60 * 1000));
      }
    }

    // 1. Chạy Baseline: Nearest Neighbor
    const nnRoute = solveNearestNeighbor(subDist);
    const nnEval = evaluateRoute(nnRoute, subDist, subDur, deadlines, { startTime, returnToHub: true });

    // Đọc baseline cũ để đối sánh
    let baselineMap = new Map<string, any>();
    const baselinePath = path.join(__dirname, 'test_fixtures', 'baseline_benchmark_results.json');
    if (fs.existsSync(baselinePath)) {
      const oldData: any[] = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      for (const item of oldData) baselineMap.set(item.scId, item);
    }

    // 2. Dựng đơn giả lập
    const mockOrders: any[] = sc.pointIndices.map((ptIdx, localIdx) => {
      const pt = THUDUC_DELIVERY_POINTS[ptIdx - 1];
      return {
        id: `mock-order-${sc.id}-${localIdx + 1}`,
        status: 'AT_HUB',
        deliveryLatitude: pt.lat,
        deliveryLongitude: pt.lng,
        estimatedDeliveryDate: deadlines[localIdx],
      };
    });

    // Ép GA dùng CHÍNH ma trận đóng băng (nếu không GA sẽ tự gọi Goong/OSRM/Haversine
    // và bị chấm trên một ma trận khác).
    const frozen = { distanceMatrix: subDist, durationMatrix: subDur, matrixSource: 'frozen-cache' };

    const runGa = async (returnToHub: boolean) => {
      const runs: RouteEvaluationResult[] = [];
      let totalMs = 0;
      for (let run = 0; run < GA_RUNS; run++) {
        const t0 = Date.now();
        const sorted = await vrpService.optimizeRouteStops(mockOrders, FACILITY_LOCATION, startTime, returnToHub, frozen);
        const route = sorted.map((o: any) => mockOrders.findIndex((m) => m.id === o.id) + 1);
        totalMs += Date.now() - t0;
        runs.push(evaluateRoute(route, subDist, subDur, deadlines, { startTime, returnToHub }));
      }
      return { ...summarize(runs), meanMs: Math.round(totalMs / GA_RUNS) };
    };

    // 3. GA ở cả hai chế độ: closed (so với OR-Tools cũ) và open (chế độ production cho tuyến DELIVERY)
    const gaClosed = await runGa(true);
    const gaOpen = await runGa(false);

    // 4. Nghiệm tối ưu thật (chỉ khi n đủ nhỏ)
    let optClosed: ReturnType<typeof solveExactOptimum> | null = null;
    let optOpen: ReturnType<typeof solveExactOptimum> | null = null;
    if (nodeCount <= EXACT_MAX_STOPS - 1) {
      optClosed = solveExactOptimum(subDist, subDur, deadlines, { startTime, returnToHub: true });
      optOpen = solveExactOptimum(subDist, subDur, deadlines, { startTime, returnToHub: false });
    }

    const pctOver = (v: number, ref: number | undefined) =>
      ref === undefined || ref <= 0 ? null : Number((((v - ref) / ref) * 100).toFixed(1));

    const oldBaseline = baselineMap.get(sc.id);

    results.push({
      scId: sc.id,
      name: sc.name,
      orders: nodeCount,
      tightRatio: `${Math.round(sc.tightDeadlineRatio * 100)}%`,
      nnKm: nnEval.totalDistanceKm,
      oldGaKm: oldBaseline ? oldBaseline.gaMeanKm : null,
      closed: {
        ga: gaClosed,
        optimum: optClosed ? pick(optClosed.evaluation) : null,
        scoreOverOptimumPct: pctOver(gaClosed.meanScore, optClosed?.evaluation.compositeScore),
        bestScoreOverOptimumPct: pctOver(gaClosed.minScore, optClosed?.evaluation.compositeScore),
      },
      open: {
        ga: gaOpen,
        optimum: optOpen ? pick(optOpen.evaluation) : null,
        scoreOverOptimumPct: pctOver(gaOpen.meanScore, optOpen?.evaluation.compositeScore),
        bestScoreOverOptimumPct: pctOver(gaOpen.minScore, optOpen?.evaluation.compositeScore),
      },
    });
  }

  printTable('CLOSED ROUTE (returnToHub = true)', results, 'closed');
  printTable('OPEN ROUTE (returnToHub = false) - chế độ production cho tuyến DELIVERY', results, 'open');

  console.log('Ghi chú:');
  console.log(' • Ma trận đóng băng là ma trận TỔNG HỢP (Haversine x1.35, đối xứng), không phải dữ liệu Goong:');
  console.log('   benchmark này KHÔNG kiểm tra được đường một chiều / bất đối xứng.');
  console.log(` • GA chạy ${GA_RUNS} lần/kịch bản; "TB" là trung bình, "Tốt nhất" là lần tốt nhất, "Xấu nhất" là lần tệ nhất.`);
  console.log(` • "% trên tối ưu" tính theo điểm tổng hợp so với nghiệm chính xác (chỉ có khi n <= ${EXACT_MAX_STOPS - 1}).\n`);

  const reportPath = path.join(__dirname, 'test_fixtures', 'phase2_benchmark_results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`💾 Đã lưu kết quả vào: ${reportPath}`);
}

const GA_RUNS = Number(process.env.BENCH_GA_RUNS) || 10;

function pick(e: RouteEvaluationResult) {
  return {
    km: e.totalDistanceKm,
    travelMin: e.totalTravelMinutes,
    lateCount: e.lateCount,
    lateMin: e.totalLateMinutes,
    score: e.compositeScore,
  };
}

function summarize(runs: RouteEvaluationResult[]) {
  const mean = (f: (r: RouteEvaluationResult) => number) =>
    Number((runs.reduce((a, r) => a + f(r), 0) / runs.length).toFixed(2));
  const scores = runs.map((r) => r.compositeScore);
  const mu = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mu) ** 2, 0) / scores.length);
  return {
    meanKm: mean((r) => r.totalDistanceKm),
    meanTravelMin: mean((r) => r.totalTravelMinutes),
    meanLateCount: mean((r) => r.lateCount),
    meanScore: Number(mu.toFixed(1)),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    stdScore: Number(sd.toFixed(1)),
  };
}

function printTable(title: string, results: any[], mode: 'closed' | 'open') {
  const line = '-'.repeat(138);
  console.log(`\n📊 ${title}`);
  console.log(line);
  console.log(
    'Kịch bản'.padEnd(18) + 'Đơn'.padEnd(5) + 'Gấp'.padEnd(6) +
    'GA km (TB)'.padEnd(12) + 'Trễ TB'.padEnd(8) +
    'Điểm TB'.padEnd(10) + 'Tốt nhất'.padEnd(10) + 'Xấu nhất'.padEnd(10) + 'Độ lệch'.padEnd(9) + 'ms'.padEnd(6) +
    'Tối ưu km'.padEnd(11) + 'Tối ưu điểm'.padEnd(13) + '% trên tối ưu (TB / tốt nhất)'
  );
  console.log(line);
  for (const r of results) {
    const m = r[mode];
    const o = m.optimum;
    console.log(
      r.scId.padEnd(18) + String(r.orders).padEnd(5) + r.tightRatio.padEnd(6) +
      String(m.ga.meanKm).padEnd(12) + String(m.ga.meanLateCount).padEnd(8) +
      String(m.ga.meanScore).padEnd(10) + String(m.ga.minScore).padEnd(10) + String(m.ga.maxScore).padEnd(10) + String(m.ga.stdScore).padEnd(9) + String(m.ga.meanMs).padEnd(6) +
      (o ? String(o.km) : '-').padEnd(11) + (o ? String(o.score) : '-').padEnd(13) +
      (m.scoreOverOptimumPct === null ? '-' : `${m.scoreOverOptimumPct}% / ${m.bestScoreOverOptimumPct}%`)
    );
  }
  console.log(line + '\n');
}

runBenchmark().catch((err) => {
  console.error('❌ Lỗi chạy benchmark:', err);
  process.exit(1);
});
