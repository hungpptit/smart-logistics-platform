/**
 * Chèn đơn hỏa tốc (lấy tại nhà khách -> giao thẳng, không qua bưu cục) vào tuyến còn lại của tài xế.
 *
 * Hàm thuần: không đụng DB hay API. Người gọi dựng ma trận (Goong) cho từng tài xế.
 *
 * Quy ước node trong ma trận của MỘT tài xế (kích thước m + 3, m = số điểm cam kết còn lại):
 *   0       = vị trí hiện tại của tài xế (GPS mới)
 *   1..m    = các điểm cam kết còn lại, THEO THỨ TỰ đang chạy
 *   m + 1   = điểm lấy hỏa tốc
 *   m + 2   = điểm giao hỏa tốc
 * Distance: mét (đường thực của Goong). Duration: giây. Mọi mốc thời gian là GIÂY TÍNH TỪ BÂY GIỜ.
 *
 * Chi phí dùng cùng đơn vị với routing_evaluator.ts (giây quy đổi):
 *   travelSec + phạt trễ (lateWeight*l + l^2/600) + distWeight*mét
 *
 * Không có tham số "tốc độ" nào trong file này: thời gian luôn lấy từ ma trận Goong.
 */

export type DriverRole = 'HUB_DELIVERY' | 'ON_DEMAND' | 'LINEHAUL_TRANSFER';

export interface InsertionConfig {
  serviceSec: number;               // thời gian dừng mỗi điểm
  lateWeight: number;
  distWeight: number;

  // --- Điều kiện loại bỏ cứng ---
  maxPickupEtaSec: number;          // đến điểm lấy trong vòng này
  maxPickupDistM: number;           // quãng đường thực đến điểm lấy không quá bấy nhiêu (km hiển thị cho điều phối viên)
  maxExtraLateSec: number;          // điểm cam kết CÓ HẠN được trễ hạn THÊM tối đa bấy nhiêu
  maxExtraDelaySec: number;         // MỌI điểm cam kết (kể cả không có hạn / hạn xa) bị đẩy lùi tối đa bấy nhiêu
  maxDetourM: number;               // tài xế đang có điểm cam kết: tuyến dài thêm tối đa bấy nhiêu mét

  // --- Chấm điểm ---
  maxGpsAgeSec: number;             // GPS cũ hơn mức này thì loại
  etaWeight: number;                // 1 giây khách chờ giao ~ bấy nhiêu giây chi phí
  mixedBasePenaltySec: number;      // hệ số bảo vệ: phạt cố định khi kéo tài xế kiêm nhiệm
  mixedPerCommittedStopSec: number; // hệ số bảo vệ: phạt thêm cho mỗi điểm cam kết còn lại
}

export const DEFAULT_INSERTION_CONFIG: InsertionConfig = {
  serviceSec: 300,
  lateWeight: 2.0,
  distWeight: 0.05,
  maxPickupEtaSec: 15 * 60,
  maxPickupDistM: 3000,
  maxExtraLateSec: 120,
  maxExtraDelaySec: 600,
  maxDetourM: 3000,
  maxGpsAgeSec: 180,
  etaWeight: 0.5,
  mixedBasePenaltySec: 600,
  mixedPerCommittedStopSec: 60,
};

export interface ExpressOrder {
  deadlineSec: number;  // hạn giao, giây từ bây giờ (xem expressDeadlineSec)
  weightKg?: number;
}

/**
 * Hạn giao hỏa tốc tính từ THỜI GIAN GOONG của chặng lấy -> giao, không dùng "phút/km":
 *   hạn = fixedSec + factor * pickupToDropSec   (tính từ lúc khách đặt)
 * fixedSec gồm: đến lấy + dừng lấy + dừng giao + dự phòng.  factor là độ an toàn (>1) cho chặng giao.
 * maxSec (tuỳ chọn): trần SLA tính từ lúc đặt, ví dụ 120p trừ dự phòng.
 * elapsedSec: đã trôi qua bao lâu từ lúc khách đặt (để ra hạn còn lại tính từ bây giờ).
 */
export interface ExpressDeadlineConfig {
  fixedSec: number;
  factor: number;
  maxSec?: number;
}

export const DEFAULT_EXPRESS_DEADLINE: ExpressDeadlineConfig = {
  fixedSec: 25 * 60,
  factor: 1.3,
};

export function expressDeadlineSec(
  pickupToDropSec: number,
  elapsedSec = 0,
  config: Partial<ExpressDeadlineConfig> = {},
): number {
  if (!Number.isFinite(pickupToDropSec) || pickupToDropSec < 0) {
    throw new Error(`express_insertion: pickupToDropSec không hợp lệ (${pickupToDropSec})`);
  }
  const c = { ...DEFAULT_EXPRESS_DEADLINE, ...config };
  let d = c.fixedSec + c.factor * pickupToDropSec;
  if (c.maxSec !== undefined) d = Math.min(d, c.maxSec);
  return Math.max(0, Math.round(d - elapsedSec));
}

export interface DriverCandidate {
  driverId: string;
  roles: DriverRole[];
  gpsAgeSec: number;
  committedDeadlinesSec: (number | null)[]; // độ dài m, theo thứ tự node 1..m
  distanceMatrix: number[][];               // (m+3) x (m+3)
  durationMatrix: number[][];
  loadKg?: number;                          // tải hiện tại
  capacityKg?: number;
}

export type RejectReason =
  | 'NOT_ON_DEMAND'
  | 'STALE_GPS'
  | 'OVER_CAPACITY'
  | 'PICKUP_TOO_FAR'     // quá giới hạn thời gian hoặc km đến điểm lấy
  | 'EXPRESS_LATE'       // giao hỏa tốc không kịp hạn
  | 'HURTS_COMMITTED'    // làm đơn thường trễ hạn thêm, hoặc bị đẩy lùi quá maxExtraDelaySec
  | 'DETOUR_TOO_LONG';   // tuyến dài thêm quá maxDetourM

export interface InsertionResult {
  driverId: string;
  score: number;             // càng thấp càng tốt
  marginalCost: number;      // chi phí tăng thêm của tuyến
  protectionPenalty: number;
  pickupEtaSec: number;
  pickupDistM: number;
  dropoffEtaSec: number;
  extraDistanceM: number;        // mét tuyến dài thêm so với không chèn
  maxCommittedDelaySec: number;  // điểm cam kết bị đẩy lùi nhiều nhất bao nhiêu giây
  sequence: number[];        // thứ tự node sau khi chèn (0 không nằm trong dãy)
}

export interface RankResult {
  ranked: InsertionResult[];
  rejected: { driverId: string; reason: RejectReason }[];
}

interface Sim {
  travelSec: number;
  distM: number;
  penalty: number;                 // chỉ tính các điểm cam kết
  lateByNode: Map<number, number>; // giây trễ hạn của từng điểm cam kết
  arrival: Map<number, number>;    // giây đến từng node
  arrivalDist: Map<number, number>; // mét đã đi tới từng node
}

function simulate(
  seq: number[],
  dist: number[][],
  dur: number[][],
  deadlineOfNode: (node: number) => number | null,
  committedNodes: Set<number>,
  cfg: InsertionConfig,
): Sim {
  let clock = 0, travel = 0, distM = 0, penalty = 0, prev = 0;
  const lateByNode = new Map<number, number>();
  const arrival = new Map<number, number>();
  const arrivalDist = new Map<number, number>();
  for (const nd of seq) {
    const t = dur[prev][nd], d = dist[prev][nd];
    if (!Number.isFinite(t) || !Number.isFinite(d) || t < 0 || d < 0) {
      throw new Error(`express_insertion: ô ma trận [${prev}][${nd}] không hợp lệ`);
    }
    clock += t; travel += t; distM += d;
    arrival.set(nd, clock);
    arrivalDist.set(nd, distM);
    if (committedNodes.has(nd)) {
      const dl = deadlineOfNode(nd);
      if (dl !== null && clock > dl) {
        const l = clock - dl;
        penalty += cfg.lateWeight * l + (l * l) / 600;
        lateByNode.set(nd, l);
      }
    }
    clock += cfg.serviceSec;
    prev = nd;
  }
  return { travelSec: travel, distM, penalty, lateByNode, arrival, arrivalDist };
}

const cost = (s: Sim, cfg: InsertionConfig) => s.travelSec + s.penalty + cfg.distWeight * s.distM;

const REASON_BY_PASSED: RejectReason[] = [
  'PICKUP_TOO_FAR', 'EXPRESS_LATE', 'HURTS_COMMITTED', 'DETOUR_TOO_LONG',
];

/** Thử mọi cặp vị trí (lấy trước giao) trong tuyến còn lại; trả về phương án tốt nhất hoặc lý do bị loại. */
export function bestInsertion(
  driver: DriverCandidate,
  express: ExpressOrder,
  config: Partial<InsertionConfig> = {},
): InsertionResult | { driverId: string; reason: RejectReason } {
  const cfg = { ...DEFAULT_INSERTION_CONFIG, ...config };
  const m = driver.committedDeadlinesSec.length;
  const P = m + 1, D = m + 2;
  const n = m + 3;
  if (driver.distanceMatrix.length !== n || driver.durationMatrix.length !== n) {
    throw new Error(`express_insertion: ma trận phải là ${n}x${n} (m=${m})`);
  }

  if (!driver.roles.includes('ON_DEMAND')) return { driverId: driver.driverId, reason: 'NOT_ON_DEMAND' };
  if (driver.gpsAgeSec > cfg.maxGpsAgeSec) return { driverId: driver.driverId, reason: 'STALE_GPS' };
  if (driver.capacityKg !== undefined &&
      (driver.loadKg ?? 0) + (express.weightKg ?? 0) > driver.capacityKg) {
    return { driverId: driver.driverId, reason: 'OVER_CAPACITY' };
  }

  const committed = new Set<number>();
  for (let k = 1; k <= m; k++) committed.add(k);
  const deadlineOfNode = (nd: number) => driver.committedDeadlinesSec[nd - 1] ?? null;

  const base = simulate([...committed], driver.distanceMatrix,
    driver.durationMatrix, deadlineOfNode, committed, cfg);
  const baseCost = cost(base, cfg);

  const isMixed = driver.roles.includes('HUB_DELIVERY');
  const protection = isMixed ? cfg.mixedBasePenaltySec + cfg.mixedPerCommittedStopSec * m : 0;

  // passed = số nhóm kiểm tra (lấy -> hạn hỏa tốc -> điểm cam kết -> đi vòng) đã qua ở ít nhất một phương án
  let passed = 0;
  let best: InsertionResult | null = null;

  for (let i = 0; i <= m; i++) {
    for (let j = i; j <= m; j++) {
      const seq: number[] = [];
      for (let k = 0; k <= m; k++) {
        if (k === i) seq.push(P);
        if (k === j) seq.push(D);
        if (k < m) seq.push(k + 1);
      }
      const sim = simulate(seq, driver.distanceMatrix, driver.durationMatrix, deadlineOfNode, committed, cfg);
      const pickupEta = sim.arrival.get(P)!;
      const pickupDist = sim.arrivalDist.get(P)!;
      const dropEta = sim.arrival.get(D)!;

      // 1) đến điểm lấy: giới hạn thời gian VÀ km đường thực
      if (pickupEta > cfg.maxPickupEtaSec || pickupDist > cfg.maxPickupDistM) continue;
      passed = Math.max(passed, 1);

      // 2) giao hỏa tốc kịp hạn
      if (dropEta > express.deadlineSec) continue;
      passed = Math.max(passed, 2);

      // 3) bảo vệ điểm cam kết: không trễ hạn thêm, và không bị đẩy lùi quá mức (kể cả đơn không có hạn gấp)
      let maxDelay = 0;
      let hurts = false;
      for (const nd of committed) {
        const delay = sim.arrival.get(nd)! - base.arrival.get(nd)!;
        const extraLate = (sim.lateByNode.get(nd) ?? 0) - (base.lateByNode.get(nd) ?? 0);
        if (delay > maxDelay) maxDelay = delay;
        if (extraLate > cfg.maxExtraLateSec || delay > cfg.maxExtraDelaySec) { hurts = true; break; }
      }
      if (hurts) continue;
      passed = Math.max(passed, 3);

      // 4) giới hạn đi vòng: chỉ áp dụng khi tài xế đang có điểm cam kết (tài xế rảnh đã bị chặn bởi maxPickupDistM)
      const extraDist = sim.distM - base.distM;
      if (m > 0 && extraDist > cfg.maxDetourM) continue;
      passed = 4;

      const marginal = cost(sim, cfg) - baseCost;
      const score = marginal + cfg.etaWeight * dropEta + protection;
      if (!best || score < best.score) {
        best = {
          driverId: driver.driverId, score, marginalCost: marginal, protectionPenalty: protection,
          pickupEtaSec: pickupEta, pickupDistM: pickupDist, dropoffEtaSec: dropEta,
          extraDistanceM: extraDist, maxCommittedDelaySec: maxDelay, sequence: seq,
        };
      }
    }
  }

  if (best) return best;
  return { driverId: driver.driverId, reason: REASON_BY_PASSED[Math.min(passed, 3)] };
}

/** Xếp hạng mọi tài xế ứng viên cho một đơn hỏa tốc. ranked rỗng = không ai đủ điều kiện. */
export function rankDriversForExpress(
  candidates: DriverCandidate[],
  express: ExpressOrder,
  config: Partial<InsertionConfig> = {},
): RankResult {
  const ranked: InsertionResult[] = [];
  const rejected: RankResult['rejected'] = [];
  for (const c of candidates) {
    const r = bestInsertion(c, express, config);
    if ('reason' in r) rejected.push(r); else ranked.push(r);
  }
  ranked.sort((a, b) => a.score - b.score);
  return { ranked, rejected };
}

/**
 * Lọc sơ bộ để giảm số lần gọi Goong: chỉ cần MỘT lượt gọi (vị trí GPS từng tài xế -> điểm lấy).
 * Thời gian/km đi thẳng từ GPS đến điểm lấy là cận dưới của ETA lấy hàng trong mọi phương án chèn,
 * nên ai vượt ngưỡng ở đây sẽ không bao giờ qua được bước 1 của bestInsertion. (Chính xác khi ma trận Goong
 * gần thoả bất đẳng thức tam giác; lệch nhỏ thì chỉ làm lọc hơi nhẹ tay, không bỏ sót.)
 * Chỉ dựng ma trận đầy đủ cho các tài xế còn lại.
 */
export function prescreenByPickup(
  gpsToPickup: { driverId: string; durationSec: number; distanceM?: number }[],
  config: Partial<Pick<InsertionConfig, 'maxPickupEtaSec' | 'maxPickupDistM'>> = {},
): { passed: string[]; rejected: string[] } {
  const maxEta = config.maxPickupEtaSec ?? DEFAULT_INSERTION_CONFIG.maxPickupEtaSec;
  const maxDist = config.maxPickupDistM ?? DEFAULT_INSERTION_CONFIG.maxPickupDistM;
  const passed: string[] = [], rejected: string[] = [];
  for (const c of gpsToPickup) {
    const ok = c.durationSec <= maxEta && (c.distanceM === undefined || c.distanceM <= maxDist);
    (ok ? passed : rejected).push(c.driverId);
  }
  return { passed, rejected };
}

/**
 * Chọn tài xế cho BATCH bưu cục:
 *  - loại tài xế không có HUB_DELIVERY (ví dụ chỉ ON_DEMAND)
 *  - giữ lại tối đa reserveK tài xế kiêm nhiệm (HUB_DELIVERY + ON_DEMAND) để trực hỏa tốc
 *  - luôn chừa ít nhất 1 tài xế cho batch
 */
export function selectBatchDrivers<T extends { driverId: string; roles: DriverRole[] }>(
  drivers: T[],
  reserveK: number,
  reservePriority: (a: T, b: T) => number = (a, b) => a.driverId.localeCompare(b.driverId),
): { batch: T[]; reserved: T[]; excluded: T[] } {
  const excluded = drivers.filter(d => !d.roles.includes('HUB_DELIVERY'));
  const capable = drivers.filter(d => d.roles.includes('HUB_DELIVERY'));
  const mixed = capable.filter(d => d.roles.includes('ON_DEMAND')).sort(reservePriority);
  const k = Math.max(0, Math.min(reserveK, mixed.length, capable.length - 1));
  const reserved = mixed.slice(0, k);
  const reservedIds = new Set(reserved.map(d => d.driverId));
  return { batch: capable.filter(d => !reservedIds.has(d.driverId)), reserved, excluded };
}
