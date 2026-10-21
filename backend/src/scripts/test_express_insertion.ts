import {
  DriverCandidate, DriverRole, rankDriversForExpress, selectBatchDrivers,
  expressDeadlineSec, prescreenByPickup,
} from '../services/routing/express_insertion';

type Pt = [number, number]; // km trên mặt phẳng
const SPEED_MS = 11 / 3.6;  // CHỈ để dựng ma trận giả cho test; code thật đọc ma trận Goong
const road = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]) * 1000 * 1.35;

const PICKUP: Pt = [0, 0];
const DROP: Pt = [3, 0];
const EXPRESS = { deadlineSec: 60 * 60 };

function cand(id: string, roles: DriverRole[], pos: Pt, committed: Pt[], dls: (number | null)[], gpsAge = 30): DriverCandidate {
  const pts = [pos, ...committed, PICKUP, DROP];
  const dist = pts.map(a => pts.map(b => road(a, b)));
  const dur = dist.map(r => r.map(d => d / SPEED_MS));
  return { driverId: id, roles, gpsAgeSec: gpsAge, committedDeadlinesSec: dls, distanceMatrix: dist, durationMatrix: dur };
}

let failed = false;
const assert = (c: boolean, m: string) => { if (!c) { console.error('FAIL:', m); failed = true; } };
const show = (title: string, res: ReturnType<typeof rankDriversForExpress>) => {
  console.log(title);
  for (const r of res.ranked) {
    console.log(`  OK  ${r.driverId.padEnd(24)} score=${r.score.toFixed(0).padStart(5)} lấy=${(r.pickupEtaSec / 60).toFixed(1)}p/${(r.pickupDistM / 1000).toFixed(1)}km ` +
      `giao=${(r.dropoffEtaSec / 60).toFixed(1)}p thêm=${(r.extraDistanceM / 1000).toFixed(1)}km chậm tối đa=${(r.maxCommittedDelaySec / 60).toFixed(1)}p`);
  }
  for (const r of res.rejected) console.log(`  --  ${r.driverId.padEnd(24)} ${r.reason}`);
};

const candidates = [
  cand('A_ondemand_2km', ['ON_DEMAND'], [-2, 0], [], []),
  cand('B_mixed_idle_1.5km', ['HUB_DELIVERY', 'ON_DEMAND'], [0, 1.5], [], []),
  cand('C_mixed_busy_tight', ['HUB_DELIVERY', 'ON_DEMAND'], [0.3, 0.3], [[1, 1], [0.5, -1], [2, 2]], [null, 14 * 60, null]),
  cand('D_ondemand_stale_gps', ['ON_DEMAND'], [0.2, 0], [], [], 600),
  cand('E_ondemand_9km', ['ON_DEMAND'], [9, 0], [], []),
  cand('F_hub_only', ['HUB_DELIVERY'], [0.1, 0], [], []),
  // đang chạy, 2 đơn thường KHÔNG có hạn gấp (hạn ngày mai), đứng sát điểm lấy
  cand('G_mixed_busy_nodeadline', ['HUB_DELIVERY', 'ON_DEMAND'], [0.4, 0], [[0.6, 0.3], [1.2, 0.5]], [null, null]),
];

// ---- 1) Mặc định: mọi điều kiện bật ----
const res = rankDriversForExpress(candidates, EXPRESS);
show('MẶC ĐỊNH (maxExtraDelaySec=600, maxPickupDistM=3000, maxDetourM=3000):', res);
const reasons = Object.fromEntries(res.rejected.map(r => [r.driverId, r.reason]));
assert(reasons['D_ondemand_stale_gps'] === 'STALE_GPS', 'D phải bị loại vì GPS cũ');
assert(reasons['E_ondemand_9km'] === 'PICKUP_TOO_FAR', 'E phải bị loại vì quá xa');
assert(reasons['F_hub_only'] === 'NOT_ON_DEMAND', 'F không có ON_DEMAND');
assert(reasons['C_mixed_busy_tight'] === 'HURTS_COMMITTED', 'C phải bị loại vì làm trễ điểm cam kết');
assert(reasons['G_mixed_busy_nodeadline'] === 'HURTS_COMMITTED',
  'G (không có hạn gấp) phải bị loại vì bị đẩy lùi quá maxExtraDelaySec -- lỗ hổng cũ đã được vá');
assert(res.ranked.length === 2 && res.ranked[0].driverId === 'A_ondemand_2km', 'chỉ còn A, B; A (chỉ ON_DEMAND) đứng đầu');

// ---- 2) Hành vi CŨ (tắt giới hạn chậm) để chứng minh lỗ hổng ----
// G vi phạm CẢ HAI giới hạn mới: chậm 10,2 phút (> 10p) và đi vòng thêm 3,5 km (> 3 km).
// Chỉ nới một giới hạn thì G vẫn bị loại bởi giới hạn còn lại.
const onlyDelayOff = rankDriversForExpress(candidates, EXPRESS, { maxExtraDelaySec: Infinity });
assert(onlyDelayOff.rejected.find(r => r.driverId === 'G_mixed_busy_nodeadline')?.reason === 'DETOUR_TOO_LONG',
  'tắt giới hạn chậm: G vẫn bị loại vì đi vòng 3,5 km > 3 km');
const onlyDetourOff = rankDriversForExpress(candidates, EXPRESS, { maxDetourM: Infinity });
assert(onlyDetourOff.rejected.find(r => r.driverId === 'G_mixed_busy_nodeadline')?.reason === 'HURTS_COMMITTED',
  'tắt giới hạn đi vòng: G vẫn bị loại vì chậm 10,2p > 10p');

const legacy = rankDriversForExpress(candidates, EXPRESS, { maxExtraDelaySec: Infinity, maxDetourM: Infinity });
const g = legacy.ranked.find(r => r.driverId === 'G_mixed_busy_nodeadline');
assert(!!g, 'khi tắt cả hai giới hạn (hành vi cũ), G lọt qua');
if (g) console.log(`\nHành vi CŨ (tắt 2 giới hạn): G lọt qua, đơn thường chậm thêm ${(g.maxCommittedDelaySec / 60).toFixed(1)} phút, tuyến dài thêm ${(g.extraDistanceM / 1000).toFixed(1)} km mà không bị phàn nàn.`);

// ---- 3) Nới giới hạn thì G lại được nhận ----
const loose = rankDriversForExpress(candidates, EXPRESS, { maxExtraDelaySec: 1200, maxDetourM: 5000 });
assert(loose.ranked.some(r => r.driverId === 'G_mixed_busy_nodeadline'), 'nới chậm 20p và đi vòng 5 km thì G được nhận');

// ---- 4) Giới hạn đi vòng bằng km ----
// H đang có 1 điểm cam kết gần, phải kéo tuyến dài thêm nhiều km để giao hỏa tốc 3 km xa
const H = cand('H_busy_far_detour', ['HUB_DELIVERY', 'ON_DEMAND'], [0.2, 0], [[0, -0.5]], [null]);
const detour = rankDriversForExpress([H], EXPRESS, { maxExtraDelaySec: Infinity });
assert(detour.rejected[0]?.reason === 'DETOUR_TOO_LONG', 'H phải bị loại vì đi vòng quá maxDetourM');
const detourOk = rankDriversForExpress([H], EXPRESS, { maxExtraDelaySec: Infinity, maxDetourM: 20000 });
assert(detourOk.ranked.length === 1, 'nới maxDetourM thì H được nhận');

// ---- 5) Giới hạn km đến điểm lấy: nới thời gian nhưng km vẫn chặn ----
const farKm = rankDriversForExpress([cand('far', ['ON_DEMAND'], [-4, 0], [], [])], EXPRESS, { maxPickupEtaSec: 3600 });
assert(farKm.rejected[0]?.reason === 'PICKUP_TOO_FAR', 'km đến điểm lấy 5,4 > 3 km vẫn bị chặn dù thời gian cho phép');

// ---- 6) Hệ số bảo vệ ----
const tie = rankDriversForExpress([
  cand('mixed', ['HUB_DELIVERY', 'ON_DEMAND'], [-1, 0], [], []),
  cand('only', ['ON_DEMAND'], [-1, 0], [], []),
], EXPRESS).ranked;
assert(tie[0].driverId === 'only', 'ON_DEMAND-only phải thắng khi hoà khoảng cách');

// ---- 7) Hạn hỏa tốc tính từ thời gian Goong ----
assert(expressDeadlineSec(1800) === 25 * 60 + Math.round(1.3 * 1800), 'hạn = 25p + 1.3 x thời gian Goong chặng lấy->giao');
assert(expressDeadlineSec(1800, 120) === 25 * 60 + Math.round(1.3 * 1800) - 120, 'trừ thời gian đã trôi qua từ lúc đặt');
assert(expressDeadlineSec(6000, 0, { maxSec: 75 * 60 }) === 75 * 60, 'trần SLA trừ dự phòng (120p - 45p = 75p)');
let threw = false; try { expressDeadlineSec(-1); } catch { threw = true; }
assert(threw, 'thời gian âm phải báo lỗi');

// ---- 8) Lọc sơ bộ bằng 1 lượt gọi ----
const pre = prescreenByPickup([
  { driverId: 'a', durationSec: 300, distanceM: 800 },
  { driverId: 'b', durationSec: 1200 },                 // quá 15 phút
  { driverId: 'c', durationSec: 600, distanceM: 4000 }, // quá 3 km
  { driverId: 'd', durationSec: 840 },
]);
assert(pre.passed.join() === 'a,d' && pre.rejected.join() === 'b,c', 'prescreen giữ a,d; loại b,c');

// ---- 9) Batch filter ----
const dr = (id: string, roles: DriverRole[]) => ({ driverId: id, roles });
const sel = selectBatchDrivers([
  dr('d1', ['ON_DEMAND']), dr('d2', ['HUB_DELIVERY']), dr('d3', ['HUB_DELIVERY', 'ON_DEMAND']),
  dr('d4', ['HUB_DELIVERY', 'ON_DEMAND']), dr('d5', ['HUB_DELIVERY']),
], 1);
assert(sel.excluded.map(d => d.driverId).join() === 'd1', 'd1 bị loại khỏi batch');
assert(sel.reserved.length === 1 && sel.batch.length === 3, 'giữ 1, batch còn 3');
const all = selectBatchDrivers([dr('x', ['HUB_DELIVERY', 'ON_DEMAND'])], 5);
assert(all.batch.length === 1 && all.reserved.length === 0, 'luôn chừa ít nhất 1 cho batch');

if (failed) { console.error('\nCó kiểm tra THẤT BẠI.'); process.exit(1); }
console.log('\nTất cả kiểm tra đạt.');
