import { Router } from 'express';
import { ShipmentController } from '../controllers/shipment.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateShipmentDto, UpdateShipmentStatusDto } from '../dtos/shipment.dto';

const router = Router();
const shipmentController = new ShipmentController();

// Require auth for all shipment operations
router.use(authMiddleware);

// Only ADMIN and STAFF can manage shipments
router.use(requireRoles(['ADMIN', 'STAFF']));

/**
 * @openapi
 * /shipments:
 *   get:
 *     tags:
 *       - Shipments
 *     summary: Lấy danh sách vận đơn lớn (Shipments)
 *     description: Trả về danh sách tất cả các vận đơn trong hệ thống cùng bộ lọc trạng thái và tìm kiếm mã vận đơn.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Lọc trạng thái (CREATED, ASSIGNED, IN_TRANSIT, AT_HUB, OUT_FOR_DELIVERY, DELIVERED, DELIVERY_FAILED, RETURNING, RETURNED)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo mã vận đơn (shipmentCode)
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', shipmentController.getAll);

/**
 * @openapi
 * /shipments/{id}:
 *   get:
 *     tags:
 *       - Shipments
 *     summary: Xem chi tiết vận đơn gom hàng
 *     description: Lấy chi tiết vận đơn bao gồm lộ trình đi kèm, danh sách các kiện hàng bên trong và lịch sử sự kiện luân chuyển (ShipmentEvents).
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
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy vận đơn
 */
router.get('/:id', shipmentController.getById);

/**
 * @openapi
 * /shipments:
 *   post:
 *     tags:
 *       - Shipments
 *     summary: Tạo vận đơn gom kiện hàng mới
 *     description: Khởi tạo phiếu vận chuyển để gom hàng loạt các kiện hàng nhỏ lẻ đi chung chặng đường (Staff & Admin).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageIds
 *             properties:
 *               packageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["d290f1ee-6c54-4b01-90e6-d701748f0851", "d290f1ee-6c54-4b01-90e6-d701748f0852"]
 *               routeId:
 *                 type: string
 *                 format: uuid
 *                 example: "d290f1ee-6c54-4b01-90e6-d701748f0853"
 *               status:
 *                 type: string
 *                 example: CREATED
 *     responses:
 *       201:
 *         description: Tạo vận đơn thành công
 *       400:
 *         description: Một trong các kiện hàng đã nằm trong vận đơn khác đang hoạt động
 */
router.post(
  '/',
  validationMiddleware(CreateShipmentDto),
  shipmentController.create
);

/**
 * @openapi
 * /shipments/{id}/status:
 *   patch:
 *     tags:
 *       - Shipments
 *     summary: Cập nhật trạng thái luân chuyển của vận đơn
 *     description: Đổi trạng thái vận đơn (ví dụ sang IN_TRANSIT, AT_HUB, DELIVERED) và đồng bộ cập nhật trạng thái của toàn bộ đơn hàng con đi kèm.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 example: IN_TRANSIT
 *               facilityId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của bưu cục/kho bãi nếu chuyển trạng thái cập bến kho (AT_HUB)
 *                 example: "d290f1ee-6c54-4b01-90e6-d701748f0854"
 *               latitude:
 *                 type: number
 *                 example: 10.7769
 *               longitude:
 *                 type: number
 *                 example: 106.7009
 *               notes:
 *                 type: string
 *                 example: Vận đơn bắt đầu xuất bến đi chặng giữa
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy vận đơn
 */
router.patch(
  '/:id/status',
  validationMiddleware(UpdateShipmentStatusDto),
  shipmentController.updateStatus
);

/**
 * @openapi
 * /shipments/{id}:
 *   delete:
 *     tags:
 *       - Shipments
 *     summary: Hủy/Xóa vận đơn
 *     description: Đánh dấu xóa vận đơn. Chỉ cho phép xóa khi vận đơn mới tạo ở trạng thái CREATED và chưa thực thi giao nhận.
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
 *         description: Xóa thành công
 *       400:
 *         description: Không được xóa vận đơn đã xuất bến/hoạt động
 */
router.delete('/:id', shipmentController.delete);

export default router;
