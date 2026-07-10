import { Router } from 'express';
import { RoutingController } from '../controllers/routing.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';

const router = Router();
const routingController = new RoutingController();

// Require authentication for all routing endpoints
router.use(authMiddleware);

/**
 * @openapi
 * /routes/optimize:
 *   post:
 *     tags:
 *       - Routing
 *     summary: Kích hoạt thuật toán AI tối ưu định tuyến và điều phối tài xế
 *     description: Tự động gom cụm đơn hàng (K-Means), ghép cặp tối ưu tài xế (Hungarian + Driver Affinity) và tối ưu lộ trình (Genetic Algorithm VRP).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - facilityId
 *             properties:
 *               facilityId:
 *                 type: string
 *                 format: uuid
 *                 example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
 *     responses:
 *       200:
 *         description: Tối ưu định tuyến thành công
 *       400:
 *         description: Thiếu thông tin hoặc không có đơn hàng/tài xế phù hợp
 */
router.post(
  '/optimize',
  requireRoles(['ADMIN', 'STAFF']),
  routingController.optimize
);

export default router;
