import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { VRPService } from '../services/routing/vrp.service';
import { evaluateRoute } from './routing_evaluator';
import { solveExactOptimum } from './optimum_reference';

dotenv.config();

// 1. Tọa độ Bưu cục Đặng Văn Bi & 8 Điểm giao hàng thực tế trên địa bàn phường Bình Thọ / Linh Chiểu
const FACILITY = {
  id: 'FAC-TD-DANGBI',
  name: 'Bưu cục Đặng Văn Bi (Kho xuất phát)',
  address: 'Số 1 Đặng Văn Bi, Bình Thọ, TP. Thủ Đức',
  lat: 10.8495,
  lng: 106.7625,
};

const STOPS = [
  // 1 & 2: Dọc trục Đặng Văn Bi
  { id: 1, name: 'Khách A', addr: '120 Đặng Văn Bi, Bình Thọ', lat: 10.8490, lng: 106.7610 },
  { id: 2, name: 'Khách B', addr: '85 Đặng Văn Bi, Bình Thọ', lat: 10.8480, lng: 106.7595 },

  // 3 & 4: Rẽ vào trục Dân Chủ
  { id: 3, name: 'Khách C', addr: '18 Dân Chủ, Bình Thọ', lat: 10.8510, lng: 106.7635 },
  { id: 4, name: 'Khách D', addr: '55 Dân Chủ, Bình Thọ', lat: 10.8525, lng: 106.7650 },

  // 5 & 6: Sang trục Khổng Tử (khu biệt thự bàn cờ Bình Thọ)
  { id: 5, name: 'Khách E', addr: '25 Khổng Tử, Bình Thọ', lat: 10.8500, lng: 106.7640 },
  { id: 6, name: 'Khách F', addr: '50 Khổng Tử, Bình Thọ', lat: 10.8515, lng: 106.7655 },

  // 7: Bác Ái (đường cắt ngang có đoạn hẹp)
  { id: 7, name: 'Khách G', addr: '22 Bác Ái, Bình Thọ', lat: 10.8485, lng: 106.7670 },

  // 8: Trục chính Võ Văn Ngân (đường có dải phân cách giữa, cấm quay đầu)
  { id: 8, name: 'Khách H', addr: '78 Võ Văn Ngân, Linh Chiểu', lat: 10.8525, lng: 106.7705 },
];

async function getOrFetchGoongMatrix(apiKey: string) {
  const cachePath = path.join(__dirname, 'test_fixtures', 'real_goong_dangbi_matrix.json');

  if (fs.existsSync(cachePath)) {
    console.log('📦 [Goong Case] Đã nạp ma trận Goong Maps THẬT từ cache JSON.');
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }

  console.log('🌐 [Goong Case] Gọi Goong DistanceMatrix API (vehicle=bike) cho 9 điểm tại Thủ Đức...');
  const allLocations = [FACILITY, ...STOPS];
  const originsStr = allLocations.map((loc) => `${loc.lat},${loc.lng}`).join('|');
  const url = `https://rsapi.goong.io/DistanceMatrix?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(originsStr)}&vehicle=bike&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Goong API error: ${res.status}`);
  const data = (await res.json()) as any;

  const n = allLocations.length;
  const distanceMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const durationMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const el = data.rows[i].elements[j];
      distanceMatrix[i][j] = el.distance.value;
      durationMatrix[i][j] = el.duration.value;
    }
  }

  const cache = { distanceMatrix, durationMatrix, locations: allLocations };
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
  console.log(`✅ [Goong Case] Đã lưu ma trận Goong thật vào: ${cachePath}`);
  return cache;
}

async function runRealCase() {
  console.log('================================================================================');
  console.log('📍 KHẢO SÁT CA THỰC TẾ: BƯU CỤC ĐẶNG VĂN BI (THỦ ĐỨC) - DỮ LIỆU MA TRẬN GOONG MAPS');
  console.log('================================================================================\n');

  const apiKey = process.env.GOONG_API_KEY;
  if (!apiKey) {
    throw new Error('Vui lòng thiết lập biến môi trường GOONG_API_KEY trong .env');
  }
  const { distanceMatrix, durationMatrix, locations } = await getOrFetchGoongMatrix(apiKey);

  const n = STOPS.length; // 8 stops

  // 1. Phân tích tính bất đối xứng của mạng lưới giao thông thật từ Goong
  console.log('🔍 [1] PHÂN TÍCH TÍNH BẤT ĐỐI XỨNG CỦA ĐƯỜNG PHỐ THẬT (Đường 1 chiều / dải phân cách):');
  let maxDiffM = 0;
  let maxDiffPair = '';
  let totalAsymmetry = 0;
  let countPairs = 0;

  for (let i = 0; i <= n; i++) {
    for (let j = i + 1; j <= n; j++) {
      const dForward = distanceMatrix[i][j];
      const dBackward = distanceMatrix[j][i];
      const diff = Math.abs(dForward - dBackward);
      totalAsymmetry += diff;
      countPairs++;
      if (diff > maxDiffM) {
        maxDiffM = diff;
        maxDiffPair = `${locations[i].name} (${i}) <-> ${locations[j].name} (${j}): đi ${dForward}m vs về ${dBackward}m (lệch ${diff}m)`;
      }
    }
  }

  const avgDiffM = Math.round(totalAsymmetry / countPairs);
  console.log(` • Chênh lệch cự ly trung bình giữa 2 chiều: ${avgDiffM} mét.`);
  console.log(` • Cặp điểm lệch nhiều nhất: ${maxDiffPair}`);
  if (avgDiffM > 50) {
    console.log(' ⚠️ KẾT LUẬN: Ma trận Goong có tính BẤT ĐỐI XỨNG RÕ RỆT (ảnh hưởng bởi dải phân cách Võ Văn Ngân, hướng lưu thông).');
  }

  // 2. Thiết lập deadline giả định thực tế: 1 đơn gấp (Khách H ở Võ Văn Ngân cần giao trong 45 phút)
  const startTime = new Date('2026-10-13T08:00:00Z');
  const deadlines: (Date | null)[] = [
    null, // 1: Đặng Văn Bi
    null, // 2: Đặng Văn Bi
    null, // 3: Dân Chủ
    null, // 4: Dân Chủ
    null, // 5: Khổng Tử
    null, // 6: Khổng Tử
    null, // 7: Bác Ái
    new Date(startTime.getTime() + 45 * 60 * 1000), // 8: Võ Văn Ngân có hẹn gấp 45 phút
  ];

  // 3. Định nghĩa các phương án so sánh
  // Phương án A: Con người vẽ tay trực quan (Đi hết Đặng Văn Bi -> sang Khổng Tử -> Dân Chủ -> Bác Ái -> ra Võ Văn Ngân)
  // Thứ tự stops: 1, 2, 5, 6, 3, 4, 7, 8
  const humanIntuitiveRoute = [1, 2, 5, 6, 3, 4, 7, 8];

  // Phương án B: Nghiệm tối ưu toán học tuyệt đối (Branch & Bound) trên ma trận Goong thật
  const exactClosed = solveExactOptimum(distanceMatrix, durationMatrix, deadlines, { startTime, returnToHub: true });
  const exactOpen = solveExactOptimum(distanceMatrix, durationMatrix, deadlines, { startTime, returnToHub: false });

  // Phương án C: Thuật toán Di truyền (GA với Multi-start 5 lần)
  const vrpService = new VRPService();
  const mockOrders: any[] = STOPS.map((s, idx) => ({
    id: `dangbi-order-${s.id}`,
    status: 'AT_HUB',
    deliveryLatitude: s.lat,
    deliveryLongitude: s.lng,
    estimatedDeliveryDate: deadlines[idx],
  }));

  const frozen = { distanceMatrix, durationMatrix, matrixSource: 'goong' };
  const gaSortedClosed = await vrpService.optimizeRouteStops(mockOrders, FACILITY, startTime, true, frozen);
  const gaRouteClosed = gaSortedClosed.map((o: any) => mockOrders.findIndex((m) => m.id === o.id) + 1);

  const gaSortedOpen = await vrpService.optimizeRouteStops(mockOrders, FACILITY, startTime, false, frozen);
  const gaRouteOpen = gaSortedOpen.map((o: any) => mockOrders.findIndex((m) => m.id === o.id) + 1);

  // Đánh giá tất cả phương án
  const evalHumanClosed = evaluateRoute(humanIntuitiveRoute, distanceMatrix, durationMatrix, deadlines, { startTime, returnToHub: true });
  const evalHumanOpen = evaluateRoute(humanIntuitiveRoute, distanceMatrix, durationMatrix, deadlines, { startTime, returnToHub: false });

  const evalGaClosed = evaluateRoute(gaRouteClosed, distanceMatrix, durationMatrix, deadlines, { startTime, returnToHub: true });
  const evalGaOpen = evaluateRoute(gaRouteOpen, distanceMatrix, durationMatrix, deadlines, { startTime, returnToHub: false });

  console.log('\n================================================================================');
  console.log('📊 [2] KẾT QUẢ ĐỐI SÁNH TRÊN MA TRẬN GOONG MAPS THẬT (8 ĐƠN TẠI BÌNH THỌ - THỦ ĐỨC)');
  console.log('================================================================================\n');

  console.log('--- CHẾ ĐỘ GIAO HÀNG THỰC TẾ (OPEN ROUTE - Kết thúc tại khách cuối) ---');
  console.log(`1. Phương án vẽ tay theo cụm:   ${evalHumanOpen.totalDistanceKm} km | ${evalHumanOpen.totalTravelMinutes} phút lái | ${evalHumanOpen.lateCount} đơn trễ | Điểm: ${evalHumanOpen.compositeScore}`);
  console.log(`   Lộ trình: Kho -> ${humanIntuitiveRoute.join(' -> ')}`);
  console.log(`2. Lời giải Thuật toán GA:     ${evalGaOpen.totalDistanceKm} km | ${evalGaOpen.totalTravelMinutes} phút lái | ${evalGaOpen.lateCount} đơn trễ | Điểm: ${evalGaOpen.compositeScore}`);
  console.log(`   Lộ trình: Kho -> ${gaRouteOpen.join(' -> ')}`);
  console.log(`3. Nghiệm tối ưu tuyệt đối:    ${exactOpen.evaluation.totalDistanceKm} km | ${exactOpen.evaluation.totalTravelMinutes} phút lái | ${exactOpen.evaluation.lateCount} đơn trễ | Điểm: ${exactOpen.evaluation.compositeScore}`);
  console.log(`   Lộ trình: Kho -> ${exactOpen.route.join(' -> ')}\n`);

  console.log('--- CHẾ ĐỘ KHÉP KÍN (CLOSED ROUTE - Quay về kho Bưu cục) ---');
  console.log(`1. Phương án vẽ tay theo cụm:   ${evalHumanClosed.totalDistanceKm} km | ${evalHumanClosed.totalTravelMinutes} phút lái | ${evalHumanClosed.lateCount} đơn trễ | Điểm: ${evalHumanClosed.compositeScore}`);
  console.log(`2. Lời giải Thuật toán GA:     ${evalGaClosed.totalDistanceKm} km | ${evalGaClosed.totalTravelMinutes} phút lái | ${evalGaClosed.lateCount} đơn trễ | Điểm: ${evalGaClosed.compositeScore}`);
  console.log(`3. Nghiệm tối ưu tuyệt đối:    ${exactClosed.evaluation.totalDistanceKm} km | ${exactClosed.evaluation.totalTravelMinutes} phút lái | ${exactClosed.evaluation.lateCount} đơn trễ | Điểm: ${exactClosed.evaluation.compositeScore}\n`);

  // Phân tích sự khác biệt giữa phương án vẽ tay và thuật toán
  console.log('💡 [3] PHÂN TÍCH CHUYÊN SÂU: TẠI SAO LỘ TRÌNH VẼ TAY VÀ THUẬT TOÁN KHÁC NHAU?');
  const kmDiff = (evalHumanOpen.totalDistanceKm - evalGaOpen.totalDistanceKm).toFixed(2);
  const scoreDiff = (evalHumanOpen.compositeScore - evalGaOpen.compositeScore).toFixed(1);
  console.log(` • So với trực giác con người, GA tiết kiệm: ${kmDiff} km và ${scoreDiff} điểm.`);
  if (evalHumanOpen.lateCount > 0 && evalGaOpen.lateCount === 0) {
    console.log(` ⚠️ ĐẶC BIỆT: Lộ trình vẽ tay bị TRỄ ${evalHumanOpen.lateCount} đơn do con người không tính toán được thời gian tích lũy phục vụ (service time 5p/điểm)!`);
  } else if (evalHumanOpen.totalDistanceKm > evalGaOpen.totalDistanceKm) {
    console.log(` • Con người nhìn bản đồ 2D tưởng cụm Đặng Văn Bi -> Khổng Tử gần nhau, nhưng thực tế hẻm và đường nối khiến quãng đường đi dài hơn ${kmDiff} km so với thuật toán.`);
  }
}

runRealCase().catch(console.error);
