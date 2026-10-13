/**
 * Independent Routing Evaluator
 * Bộ chấm điểm độc lập dùng chung cho mọi solver (GA cũ, GA mới, OR-Tools, Lộ trình thủ công)
 */

export interface EvaluatorConfig {
  startTime?: Date;
  returnToHub?: boolean;
  serviceTimeSec?: number; // Mặc định 300s (5 phút) cho xe máy giao hàng
  lateWeight?: number;     // 1 giây trễ ≈ 2 giây lái xe
  distWeight?: number;     // 0.05 phạt nhẹ mét để phá thế hòa
}

export interface StopEvaluationDetail {
  stopIndex: number;
  nodeId: number;
  legDistanceMeters: number;
  legDurationSeconds: number;
  arrivalTime: Date;
  deadline: Date | null;
  delaySeconds: number;
  isLate: boolean;
}

export interface RouteEvaluationResult {
  totalDistanceMeters: number;
  totalDistanceKm: number;
  totalTravelMinutes: number;
  totalDurationMinutes: number; // Bao gồm cả thời gian dừng phục vụ (service time)
  lateCount: number;
  totalLateMinutes: number;
  compositeScore: number;
  details: StopEvaluationDetail[];
}

/** Đọc một ô ma trận; ném lỗi thay vì âm thầm coi thiếu dữ liệu là "đi miễn phí". */
function matrixCell(m: number[][], from: number, to: number, label: string): number {
  const v = m[from]?.[to];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    throw new Error(`routing_evaluator: ${label} matrix[${from}][${to}] không hợp lệ (${v})`);
  }
  return v;
}

/**
 * Lộ trình hợp lệ phải là hoán vị đủ các điểm 1..N đúng một lần.
 * Route rỗng/thiếu điểm (ví dụ solver lỗi) sẽ cho 0 km và trông như "ngang nhau" nếu không chặn ở đây.
 */
export function assertValidRoute(route: number[], nodeCount: number): void {
  if (route.length !== nodeCount) {
    throw new Error(`routing_evaluator: route có ${route.length} điểm, cần ${nodeCount}`);
  }
  const seen = new Set<number>();
  for (const nd of route) {
    if (!Number.isInteger(nd) || nd < 1 || nd > nodeCount || seen.has(nd)) {
      throw new Error(`routing_evaluator: route không phải hoán vị 1..${nodeCount} (điểm lỗi: ${nd})`);
    }
    seen.add(nd);
  }
}

/**
 * Đánh giá một chuỗi lộ trình dừng dựa trên ma trận khoảng cách và thời gian.
 * @param route Mảng hoán vị các node điểm dừng (1-based index, node 0 là bưu cục kho)
 * @param distanceMatrix Ma trận khoảng cách tính bằng MÉT [N+1][N+1]
 * @param durationMatrix Ma trận thời gian tính bằng GIÂY [N+1][N+1]
 * @param deadlines Danh sách deadline của từng node (index matching nodes 1..N)
 * @param options Cấu hình tham số đánh giá
 */
export function evaluateRoute(
  route: number[],
  distanceMatrix: number[][],
  durationMatrix: number[][],
  deadlines: (Date | null)[],
  options: EvaluatorConfig = {}
): RouteEvaluationResult {
  assertValidRoute(route, deadlines.length);
  const startTime = options.startTime || new Date();
  const returnToHub = options.returnToHub ?? false;
  const serviceTimeSec = options.serviceTimeSec ?? 300; // 5 phút/điểm giao
  const lateWeight = options.lateWeight ?? 2.0;
  const distWeight = options.distWeight ?? 0.05;

  let totalDistanceMeters = 0;
  let totalTravelSeconds = 0;
  let currentTimestampMs = startTime.getTime();
  let lateCount = 0;
  let totalLateSeconds = 0;
  let totalPenalty = 0;

  const details: StopEvaluationDetail[] = [];
  let prevNode = 0; // 0 là bưu cục xuất phát

  for (let i = 0; i < route.length; i++) {
    const currNode = route[i];
    const legDist = matrixCell(distanceMatrix, prevNode, currNode, 'distance');
    const legSec = matrixCell(durationMatrix, prevNode, currNode, 'duration');

    totalDistanceMeters += legDist;
    totalTravelSeconds += legSec;
    currentTimestampMs += legSec * 1000;

    const arrivalTime = new Date(currentTimestampMs);
    const deadline = deadlines[currNode - 1] || null;

    let delaySeconds = 0;
    let isLate = false;

    if (deadline) {
      const deadlineMs = new Date(deadline).getTime();
      if (currentTimestampMs > deadlineMs) {
        isLate = true;
        lateCount++;
        delaySeconds = Math.round((currentTimestampMs - deadlineMs) / 1000);
        totalLateSeconds += delaySeconds;

        // Phạt mềm lũy tiến: phạt tuyến tính + phạt bậc hai cho trễ nặng
        totalPenalty += lateWeight * delaySeconds + (delaySeconds * delaySeconds) / 600;
      }
    }

    details.push({
      stopIndex: i + 1,
      nodeId: currNode,
      legDistanceMeters: legDist,
      legDurationSeconds: legSec,
      arrivalTime,
      deadline,
      delaySeconds,
      isLate,
    });

    // Cộng thời gian phục vụ tại điểm giao (Service time)
    currentTimestampMs += serviceTimeSec * 1000;
    prevNode = currNode;
  }

  // Nếu có cấu hình quay về kho (Closed Route)
  if (returnToHub && route.length > 0) {
    const returnDist = matrixCell(distanceMatrix, prevNode, 0, 'distance');
    const returnSec = matrixCell(durationMatrix, prevNode, 0, 'duration');
    totalDistanceMeters += returnDist;
    totalTravelSeconds += returnSec;
    currentTimestampMs += returnSec * 1000;
  }

  const totalDurationSeconds = Math.round((currentTimestampMs - startTime.getTime()) / 1000);
  const compositeScore = totalTravelSeconds + totalPenalty + distWeight * totalDistanceMeters;

  return {
    totalDistanceMeters,
    totalDistanceKm: Number((totalDistanceMeters / 1000).toFixed(2)),
    totalTravelMinutes: Number((totalTravelSeconds / 60).toFixed(1)),
    totalDurationMinutes: Number((totalDurationSeconds / 60).toFixed(1)),
    lateCount,
    totalLateMinutes: Number((totalLateSeconds / 60).toFixed(1)),
    compositeScore: Number(compositeScore.toFixed(1)),
    details,
  };
}
