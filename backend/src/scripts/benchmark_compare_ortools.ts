import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { VRPService } from '../services/routing/vrp.service';
import { evaluateRoute } from './routing_evaluator';

// Tọa độ Bưu cục Đặng Văn Bi - TP. Thủ Đức (FAC-TD-DANGBI)
const FACILITY_LOCATION = {
  id: 'FAC-TD-DANGBI',
  name: 'Bưu cục Đặng Văn Bi - TP. Thủ Đức',
  lat: 10.8495,
  lng: 106.7625,
};

// 50 Điểm giao hàng thực tế trong bán kính phục vụ
const THUDUC_DELIVERY_POINTS = [
  // Cụm 1: Võ Văn Ngân & Linh Chiểu (Bình Thọ, Linh Chiểu)
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

  // Cụm 2: Đặng Văn Bi & Dân Chủ (Bình Thọ, Trường Thọ)
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

  // Cụm 3: Kha Vạn Cân & Hoàng Diệu 2 (Linh Chiểu, Linh Trung)
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

  // Cụm 4: Lê Văn Việt & Phước Long B
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

  // Cụm 5: Đỗ Xuân Hợp & Tây Hòa
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

const SCENARIOS = [
  { id: 'SC-01', name: 'Nhỏ (6 đơn) - Không có hẹn giờ', orderCount: 6, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 6, 7, 11, 15] },
  { id: 'SC-02', name: 'Nhỏ (6 đơn) - 33% hẹn giờ gấp', orderCount: 6, tightDeadlineRatio: 0.33, pointIndices: [1, 3, 5, 12, 16, 21] },
  { id: 'SC-03', name: 'Nhỏ (6 đơn) - 66% hẹn giờ gấp', orderCount: 6, tightDeadlineRatio: 0.66, pointIndices: [2, 4, 8, 14, 18, 22] },
  { id: 'SC-04', name: 'Vừa (10 đơn) - Không có hẹn giờ', orderCount: 10, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 6, 7, 11, 12, 15, 16, 21] },
  { id: 'SC-05', name: 'Vừa (10 đơn) - 30% hẹn giờ gấp', orderCount: 10, tightDeadlineRatio: 0.3, pointIndices: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28] },
  { id: 'SC-06', name: 'Vừa (10 đơn) - 70% hẹn giờ gấp', orderCount: 10, tightDeadlineRatio: 0.7, pointIndices: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29] },
  { id: 'SC-07', name: 'Trung bình (15 đơn) - Không có hẹn giờ', orderCount: 15, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 4, 6, 7, 8, 11, 12, 13, 15, 16, 17, 21, 22] },
  { id: 'SC-08', name: 'Trung bình (15 đơn) - 27% hẹn giờ gấp', orderCount: 15, tightDeadlineRatio: 0.27, pointIndices: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29] },
  { id: 'SC-09', name: 'Trung bình (15 đơn) - 67% hẹn giờ gấp', orderCount: 15, tightDeadlineRatio: 0.67, pointIndices: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30] },
  { id: 'SC-10', name: 'Đầy tải (20 đơn) - Không có hẹn giờ', orderCount: 20, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { id: 'SC-11', name: 'Đầy tải (20 đơn) - 30% hẹn giờ gấp', orderCount: 20, tightDeadlineRatio: 0.3, pointIndices: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39] },
  { id: 'SC-12', name: 'Đầy tải (20 đơn) - 65% hẹn giờ gấp', orderCount: 20, tightDeadlineRatio: 0.65, pointIndices: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40] },
  { id: 'SC-13', name: 'Cực đại (25 đơn) - 0% hẹn giờ', orderCount: 25, tightDeadlineRatio: 0.0, pointIndices: [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47] },
  { id: 'SC-14', name: 'Cực đại (25 đơn) - 32% hẹn giờ', orderCount: 25, tightDeadlineRatio: 0.32, pointIndices: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48] },
  { id: 'SC-15-CASE-STUDY', name: 'Ca lỗi thực tế (10 đơn) - 1 đơn rìa có deadline gấp', orderCount: 10, tightDeadlineRatio: 0.1, pointIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 31], tightIndices: [31] },
];

async function runOrToolsBenchmark() {
  console.log('========================================================================================');
  console.log('🔬 GIAI ĐOẠN 3: ĐỐI SÁNH THỰC NGHIỆM GA CẢI TIẾN VS GOOGLE OR-TOOLS REFERENCE SOLVER');
  console.log('========================================================================================\n');

  const cachePath = path.join(__dirname, 'test_fixtures', 'thuduc_matrix_cache.json');
  const { distanceMatrix: globalDist, durationMatrix: globalDur } = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  const vrpService = new VRPService();
  const startTime = new Date('2026-10-12T08:00:00Z');

  const results: any[] = [];
  const pythonScriptPath = path.join(__dirname, 'ortools_vrp_solver.py');

  for (const sc of SCENARIOS) {
    const nodeCount = sc.pointIndices.length;
    const subDist: number[][] = Array.from({ length: nodeCount + 1 }, () => new Array(nodeCount + 1).fill(0));
    const subDur: number[][] = Array.from({ length: nodeCount + 1 }, () => new Array(nodeCount + 1).fill(0));

    const globalIndices = [0, ...sc.pointIndices];
    for (let i = 0; i <= nodeCount; i++) {
      for (let j = 0; j <= nodeCount; j++) {
        subDist[i][j] = globalDist[globalIndices[i]][globalIndices[j]];
        subDur[i][j] = globalDur[globalIndices[i]][globalIndices[j]];
      }
    }

    const deadlines: (Date | null)[] = [];
    const deadlinesSec: (number | null)[] = [];
    const tightCount = Math.round(nodeCount * sc.tightDeadlineRatio);

    for (let i = 1; i <= nodeCount; i++) {
      const originalPointId = sc.pointIndices[i - 1];
      const isSpecificTight = sc.tightIndices && sc.tightIndices.includes(originalPointId);

      if (isSpecificTight || (!sc.tightIndices && i <= tightCount)) {
        const tightMinutes = 35 + (i % 3) * 20;
        const dl = new Date(startTime.getTime() + tightMinutes * 60 * 1000);
        deadlines.push(dl);
        deadlinesSec.push(tightMinutes * 60);
      } else {
        const dl = new Date(startTime.getTime() + 4 * 60 * 60 * 1000);
        deadlines.push(dl);
        deadlinesSec.push(4 * 3600);
      }
    }

    // 1. Chạy GA Cải Tiến (5 lần lấy trung bình trên MA TRẬN ĐÓNG BĂNG subDist/subDur)
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

    const gaKmRuns: number[] = [];
    const gaTravelMinRuns: number[] = [];
    const gaLateRuns: number[] = [];
    const gaLateMinRuns: number[] = [];
    const gaScoreRuns: number[] = [];
    const gaTimeRuns: number[] = [];

    for (let run = 0; run < 5; run++) {
      const t0 = Date.now();
      // QUAN TRỌNG: Truyền ma trận đóng băng subDist và subDur vào GA!
      const sortedOrders = await vrpService.optimizeRouteStops(
        mockOrders,
        FACILITY_LOCATION,
        startTime,
        true, // returnToHub = true
        { distanceMatrix: subDist, durationMatrix: subDur, matrixSource: 'frozen_cache' }
      );
      const gaRunMs = Date.now() - t0;

      const gaRoute = sortedOrders.map((o: any) => {
        const foundIdx = mockOrders.findIndex((m) => m.id === o.id);
        return foundIdx + 1;
      });

      // Guard kiểm tra hoán vị hợp lệ
      if (new Set(gaRoute).size !== nodeCount || gaRoute.length !== nodeCount) {
        throw new Error(`GA sinh hoán vị không hợp lệ tại ${sc.id}: ${JSON.stringify(gaRoute)}`);
      }

      const gaEval = evaluateRoute(gaRoute, subDist, subDur, deadlines, { startTime, returnToHub: true });
      gaKmRuns.push(gaEval.totalDistanceKm);
      gaTravelMinRuns.push(gaEval.totalTravelMinutes);
      gaLateRuns.push(gaEval.lateCount);
      gaLateMinRuns.push(gaEval.totalLateMinutes);
      gaScoreRuns.push(gaEval.compositeScore);
      gaTimeRuns.push(gaRunMs);
    }

    const gaMeanKm = Number((gaKmRuns.reduce((a, b) => a + b, 0) / gaKmRuns.length).toFixed(2));
    const gaMeanTravelMin = Number((gaTravelMinRuns.reduce((a, b) => a + b, 0) / gaTravelMinRuns.length).toFixed(1));
    const gaMeanLate = Number((gaLateRuns.reduce((a, b) => a + b, 0) / gaLateRuns.length).toFixed(1));
    const gaMeanLateMin = Number((gaLateMinRuns.reduce((a, b) => a + b, 0) / gaLateMinRuns.length).toFixed(1));
    const gaMeanScore = Number((gaScoreRuns.reduce((a, b) => a + b, 0) / gaScoreRuns.length).toFixed(1));
    const gaMeanTimeMs = Math.round(gaTimeRuns.reduce((a, b) => a + b, 0) / gaTimeRuns.length);

    // 2. Chạy Google OR-Tools
    const ortoolsInput = {
      distanceMatrix: subDist,
      durationMatrix: subDur,
      deadlinesSec: deadlinesSec,
      returnToHub: true,
      serviceTimeSec: 300,
      timeLimitSeconds: 2,
    };

    const tempJsonPath = path.join(__dirname, 'test_fixtures', `temp_ortools_${sc.id}.json`);
    fs.writeFileSync(tempJsonPath, JSON.stringify(ortoolsInput), 'utf-8');

    let ortoolsRoute: number[] = [];
    let ortoolsRuntimeMs = 0;

    try {
      const pyOutput = execSync(`python "${pythonScriptPath}" "${tempJsonPath}"`, { encoding: 'utf-8' });
      const parsed = JSON.parse(pyOutput);
      if (parsed.success && parsed.route) {
        ortoolsRoute = parsed.route;
        ortoolsRuntimeMs = parsed.runtimeMs;
      } else {
        throw new Error(parsed.error || 'OR-Tools failed');
      }
    } catch (err: any) {
      console.error(`Lỗi chạy OR-Tools cho ${sc.id}:`, err.message);
    } finally {
      if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    }

    // Guard kiểm tra hoán vị hợp lệ của OR-Tools
    if (new Set(ortoolsRoute).size !== nodeCount || ortoolsRoute.length !== nodeCount) {
      throw new Error(`OR-Tools sinh hoán vị không hợp lệ tại ${sc.id}: ${JSON.stringify(ortoolsRoute)}`);
    }

    const ortoolsEval = evaluateRoute(ortoolsRoute, subDist, subDur, deadlines, { startTime, returnToHub: true });

    // 3. Tính toán chênh lệch % giữa GA và OR-Tools
    const gapKm = Number((gaMeanKm - ortoolsEval.totalDistanceKm).toFixed(2));
    const gapKmPercent = ortoolsEval.totalDistanceKm > 0
      ? Number(((gapKm / ortoolsEval.totalDistanceKm) * 100).toFixed(1))
      : 0;

    const gapScorePercent = ortoolsEval.compositeScore > 0
      ? Number((((gaMeanScore - ortoolsEval.compositeScore) / ortoolsEval.compositeScore) * 100).toFixed(1))
      : 0;

    results.push({
      scId: sc.id,
      orders: nodeCount,
      tightRatio: `${Math.round(sc.tightDeadlineRatio * 100)}%`,
      source: 'frozen_cache',
      gaKm: gaMeanKm,
      gaTravelMin: gaMeanTravelMin,
      gaLate: gaMeanLate,
      gaLateMin: gaMeanLateMin,
      gaScore: gaMeanScore,
      gaRuntimeMs: gaMeanTimeMs,
      ortoolsKm: ortoolsEval.totalDistanceKm,
      ortoolsTravelMin: ortoolsEval.totalTravelMinutes,
      ortoolsLate: ortoolsEval.lateCount,
      ortoolsLateMin: ortoolsEval.totalLateMinutes,
      ortoolsScore: ortoolsEval.compositeScore,
      ortoolsRuntimeMs: ortoolsRuntimeMs,
      gapKmPercent,
      gapScorePercent,
    });
  }

  // In Bảng Đối Sánh Toàn Diện
  console.log('\n📊 BẢNG ĐỐI SÁNH HIỆU QUẢ CHUẨN XÁC: GA (MA TRẬN ĐÓNG BĂNG) vs GOOGLE OR-TOOLS:');
  console.log('='.repeat(130));
  console.log(
    'Mã KB'.padEnd(8) +
    'Đơn'.padEnd(5) +
    'Gấp'.padEnd(6) +
    'GA Km'.padEnd(9) +
    'GA Phút'.padEnd(9) +
    'GA Trễ'.padEnd(8) +
    'GA Điểm'.padEnd(10) +
    'OR Km'.padEnd(9) +
    'OR Phút'.padEnd(9) +
    'OR Trễ'.padEnd(8) +
    'OR Điểm'.padEnd(10) +
    'Lệch Km%'.padEnd(11) +
    'Lệch Điểm%'.padEnd(12) +
    'Nguồn Ma Trận'
  );
  console.log('-'.repeat(130));

  let totalGaKm = 0;
  let totalOrtoolsKm = 0;
  let totalGaScore = 0;
  let totalOrtoolsScore = 0;

  for (const r of results) {
    totalGaKm += r.gaKm;
    totalOrtoolsKm += r.ortoolsKm;
    totalGaScore += r.gaScore;
    totalOrtoolsScore += r.ortoolsScore;

    const gapKmStr = (r.gapKmPercent > 0 ? `+${r.gapKmPercent}%` : `${r.gapKmPercent}%`).padEnd(11);
    const gapScoreStr = (r.gapScorePercent > 0 ? `+${r.gapScorePercent}%` : `${r.gapScorePercent}%`).padEnd(12);

    console.log(
      r.scId.padEnd(8) +
      String(r.orders).padEnd(5) +
      r.tightRatio.padEnd(6) +
      (String(r.gaKm) + 'km').padEnd(9) +
      (String(r.gaTravelMin) + 'p').padEnd(9) +
      (String(r.gaLate) + ` (${r.gaLateMin}p)`).padEnd(8) +
      String(r.gaScore).padEnd(10) +
      (String(r.ortoolsKm) + 'km').padEnd(9) +
      (String(r.ortoolsTravelMin) + 'p').padEnd(9) +
      (String(r.ortoolsLate) + ` (${r.ortoolsLateMin}p)`).padEnd(8) +
      String(r.ortoolsScore).padEnd(10) +
      gapKmStr +
      gapScoreStr +
      r.source
    );
  }
  console.log('='.repeat(130) + '\n');

  // Tổng kết và Kiểm tra Ngưỡng 5%
  const overallAvgGapPercent = Number((((totalGaKm - totalOrtoolsKm) / totalOrtoolsKm) * 100).toFixed(1));

  console.log('🎯 TỔNG KẾT & ĐÁNH GIÁ THEO NGƯỠNG QUYẾT ĐỊNH (THRESHOLD 5%):');
  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log(`• Tổng km GA: ${totalGaKm.toFixed(2)} km | Tổng km Google OR-Tools: ${totalOrtoolsKm.toFixed(2)} km`);
  console.log(`• Khoảng cách trung bình toàn diện: ${overallAvgGapPercent > 0 ? '+' : ''}${overallAvgGapPercent}%`);
  console.log('------------------------------------------------------------------------------------------------------------------------');

  if (overallAvgGapPercent < 5.0) {
    console.log('✅ KẾT LUẬN: THỎA MÃN NGƯỠNG TỐI ƯU (< 5%)!');
    console.log(`   Thuật toán GA của bạn chỉ chênh lệch ${overallAvgGapPercent}% so với giải pháp số 1 thế giới (Google OR-Tools).`);
    console.log('   => Đạt tiệm cận tối ưu toàn cục. BỎ QUA Giai đoạn 3b, sẵn sàng chuyển thẳng sang Giai đoạn 4!');
  } else {
    console.log('⚠️ KẾT LUẬN: VƯỢT NGƯỠNG 5%!');
    console.log(`   OR-Tools vượt trội ${overallAvgGapPercent}%. Cần tiến hành Giai đoạn 3b (Cấy mầm Heuristic + Or-Opt) hoặc tích hợp OR-Tools làm Solver chính.`);
  }
  console.log('------------------------------------------------------------------------------------------------------------------------\n');

  // Lưu file kết quả
  const savePath = path.join(__dirname, 'test_fixtures', 'phase3_ortools_comparison.json');
  fs.writeFileSync(savePath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`💾 Đã lưu kết quả đối sánh chi tiết vào: ${savePath}`);
}

runOrToolsBenchmark().catch((err) => {
  console.error('❌ Lỗi chạy đối kháng OR-Tools:', err);
});
