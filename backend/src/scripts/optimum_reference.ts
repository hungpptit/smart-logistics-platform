/**
 * Exact reference solver (branch & bound) cho bài toán thứ tự điểm dừng nhỏ.
 * Dùng CÙNG công thức chi phí với routing_evaluator.ts / VRPService.calculateFitness:
 *   cost = travelSeconds + (lateWeight*late + late^2/600) + distWeight*meters
 * Chi phí chỉ tăng khi thêm điểm dừng nên cắt nhánh theo chi phí một phần là an toàn.
 * Chỉ dùng cho n <= EXACT_MAX_STOPS (độ phức tạp tệ nhất O(n!)).
 */
import { evaluateRoute, EvaluatorConfig, RouteEvaluationResult } from './routing_evaluator';

export const EXACT_MAX_STOPS = 11;

export interface ExactResult {
  route: number[];
  evaluation: RouteEvaluationResult;
  nodesVisited: number;
}

export function solveExactOptimum(
  distanceMatrix: number[][],
  durationMatrix: number[][],
  deadlines: (Date | null)[],
  options: EvaluatorConfig = {}
): ExactResult {
  const n = deadlines.length;
  if (n > EXACT_MAX_STOPS) {
    throw new Error(`solveExactOptimum: n=${n} vượt giới hạn ${EXACT_MAX_STOPS}`);
  }

  const startTime = options.startTime ?? new Date();
  const returnToHub = options.returnToHub ?? false;
  const serviceSec = options.serviceTimeSec ?? 300;
  const lateW = options.lateWeight ?? 2.0;
  const distW = options.distWeight ?? 0.05;

  // Deadline tính theo giây kể từ lúc xuất phát (Infinity = không có hạn)
  const dlSec = deadlines.map((d) =>
    d ? (new Date(d).getTime() - startTime.getTime()) / 1000 : Infinity
  );

  let bestCost = Infinity;
  let bestRoute: number[] = [];
  let nodesVisited = 0;

  const route: number[] = [];
  const used: boolean[] = new Array(n + 1).fill(false);

  const dfs = (prev: number, clock: number, travel: number, dist: number, pen: number): void => {
    nodesVisited++;
    if (travel + pen + distW * dist >= bestCost) return;

    if (route.length === n) {
      let tr = travel;
      let ds = dist;
      if (returnToHub) {
        tr += durationMatrix[prev][0];
        ds += distanceMatrix[prev][0];
      }
      const cost = tr + pen + distW * ds;
      if (cost < bestCost) {
        bestCost = cost;
        bestRoute = route.slice();
      }
      return;
    }

    // Thử điểm gần nhất trước để có cận tốt sớm
    const cands: number[] = [];
    for (let k = 1; k <= n; k++) if (!used[k]) cands.push(k);
    cands.sort((a, b) => durationMatrix[prev][a] - durationMatrix[prev][b]);

    for (const k of cands) {
      const arrive = clock + durationMatrix[prev][k];
      let p = pen;
      const late = arrive - dlSec[k - 1];
      if (late > 0) p += lateW * late + (late * late) / 600;

      used[k] = true;
      route.push(k);
      dfs(k, arrive + serviceSec, travel + durationMatrix[prev][k], dist + distanceMatrix[prev][k], p);
      route.pop();
      used[k] = false;
    }
  };

  dfs(0, 0, 0, 0, 0);

  // Chấm lại bằng evaluator chung để chắc chắn cùng một thước đo
  const evaluation = evaluateRoute(bestRoute, distanceMatrix, durationMatrix, deadlines, {
    ...options,
    startTime,
    returnToHub,
  });
  return { route: bestRoute, evaluation, nodesVisited };
}
