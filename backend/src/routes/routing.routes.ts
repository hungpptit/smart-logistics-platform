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

router.post(
  '/dev-reset',
  requireRoles(['ADMIN', 'STAFF']),
  routingController.devReset
);

/**
 * @openapi
 * /routes:
 *   get:
 *     tags:
 *       - Routing
 *     summary: Lấy danh sách toàn bộ lộ trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Trạng thái lộ trình (PLANNED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
 *       - in: query
 *         name: facilityId
 *         schema:
 *           type: string
 *         description: ID kho bãi xuất phát
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *         description: ID tài xế
 *     responses:
 *       200:
 *         description: Danh sách lộ trình
 */
router.get(
  '/',
  requireRoles(['ADMIN', 'STAFF', 'SHIPPER', 'DRIVER', 'LINEHAUL_TRANSFER']),
  routingController.getRoutes
);

/**
 * @openapi
 * /routes/{id}:
 *   get:
 *     tags:
 *       - Routing
 *     summary: Lấy chi tiết lộ trình kèm định vị GPS thời gian thực từ Redis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chi tiết lộ trình và tọa độ tài xế thời gian thực
 */
router.get(
  '/:id',
  requireRoles(['ADMIN', 'STAFF', 'SHIPPER', 'DRIVER', 'LINEHAUL_TRANSFER']),
  routingController.getRouteById
);

router.post(
  '/:id/start',
  requireRoles(['ADMIN', 'STAFF', 'SHIPPER', 'DRIVER', 'LINEHAUL_TRANSFER']),
  routingController.startRoute
);

router.post(
  '/:id/complete',
  requireRoles(['ADMIN', 'STAFF', 'SHIPPER', 'DRIVER', 'LINEHAUL_TRANSFER']),
  routingController.completeRoute
);

export default router;
