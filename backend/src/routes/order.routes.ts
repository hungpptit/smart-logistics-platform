import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateOrderDto, UpdateOrderStatusDto } from '../dtos/order.dto';

const router = Router();
const orderController = new OrderController();

// All order routes require authentication
router.use(authMiddleware);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Tạo đơn hàng vận chuyển mới
 *     description: Đặt một đơn hàng giao nhận mới, tự động tính toán khoảng cách (Haversine), áp dụng biểu phí tự động (Pricing Engine) và lưu trữ Snapshot thông tin địa chỉ/người liên hệ tại thời điểm tạo đơn.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - serviceCode
 *               - senderName
 *               - senderPhone
 *               - senderAddressLine1
 *               - senderWard
 *               - senderProvince
 *               - receiverName
 *               - receiverPhone
 *               - receiverAddressLine1
 *               - receiverWard
 *               - receiverProvince
 *               - packages
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
 *               serviceCode:
 *                 type: string
 *                 enum: [EXPRESS, STANDARD, SAVING, COLD_CHAIN]
 *                 example: STANDARD
 *               senderName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               senderPhone:
 *                 type: string
 *                 example: 0912345678
 *               senderAddressLine1:
 *                 type: string
 *                 example: 100 Lê Lợi
 *               senderAddressLine2:
 *                 type: string
 *               senderWard:
 *                 type: string
 *                 example: Phường Bến Thành
 *               senderProvince:
 *                 type: string
 *                 example: Thành phố Hồ Chí Minh
 *               senderWardCode:
 *                 type: string
 *                 example: 26737
 *               receiverName:
 *                 type: string
 *                 example: Trần Thị B
 *               receiverPhone:
 *                 type: string
 *                 example: 0987654321
 *               receiverAddressLine1:
 *                 type: string
 *                 example: 200 Quang Trung
 *               receiverAddressLine2:
 *                 type: string
 *               receiverWard:
 *                 type: string
 *                 example: Phường 10
 *               receiverProvince:
 *                 type: string
 *                 example: Thành phố Hồ Chí Minh
 *               receiverWardCode:
 *                 type: string
 *                 example: 26861
 *               isFragile:
 *                 type: boolean
 *                 default: false
 *               codAmount:
 *                 type: number
 *                 example: 500000
 *               note:
 *                 type: string
 *                 example: Giao hàng giờ hành chính
 *               packages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - packageName
 *                     - weightKg
 *                     - lengthCm
 *                     - widthCm
 *                     - heightCm
 *                   properties:
 *                     packageName:
 *                       type: string
 *                       example: Thùng các-tông quần áo
 *                     weightKg:
 *                       type: number
 *                       example: 5.5
 *                     lengthCm:
 *                       type: number
 *                       example: 30
 *                     widthCm:
 *                       type: number
 *                       example: 20
 *                     heightCm:
 *                       type: number
 *                       example: 15
 *     responses:
 *       211:
 *         description: Đặt đơn hàng thành công, trả về thông tin chi tiết đơn hàng và giá cước.
 */
router.post(
  '/',
  validationMiddleware(CreateOrderDto),
  orderController.create
);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Lấy danh sách đơn hàng
 *     description: Lấy toàn bộ đơn hàng (nếu là Admin/Staff) hoặc danh sách đơn hàng thuộc sở hữu của Khách hàng đang đăng nhập.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về danh sách đơn hàng
 */
router.get(
  '/',
  orderController.getAll
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Lấy chi tiết đơn hàng
 *     description: Trả về thông tin chi tiết đơn hàng kèm các kiện hàng (Packages), lịch sử trạng thái (Status History) và lịch sử thanh toán (Payment).
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
 *         description: Chi tiết đơn hàng
 */
router.get(
  '/by-code/:code',
  orderController.getByCode
);

router.get(
  '/:id',
  orderController.getById
);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Hủy đơn hàng
 *     description: Chuyển trạng thái đơn hàng sang CANCELLED (chỉ áp dụng khi đơn hàng đang ở trạng thái DRAFT hoặc PENDING).
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
 *         description: Hủy đơn thành công
 *       400:
 *         description: Không thể hủy đơn hàng ở trạng thái hiện tại
 */
router.post(
  '/:id/cancel',
  orderController.cancel
);

/**
 * @openapi
 * /orders/{id}/status:
 *   put:
 *     tags:
 *       - Orders
 *     summary: Cập nhật trạng thái đơn hàng (Staff/Admin)
 *     description: Nhân viên cập nhật trạng thái đơn hàng và ghi nhận lý do thay đổi.
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
 *                 enum: [PENDING, ACCEPTED, COLLECTING, IN_TRANSIT, DELIVERING, DELIVERED, RETURNED, CANCELLED]
 *                 example: ACCEPTED
 *               reason:
 *                 type: string
 *                 example: Xác nhận đơn hàng thành công
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 */
router.put(
  '/:id/status',
  requireRoles(['ADMIN', 'STAFF']),
  validationMiddleware(UpdateOrderStatusDto),
  orderController.updateStatus
);

/**
 * @openapi
 * /orders/{id}/pay:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Thanh toán đơn hàng
 *     description: Khách hàng xác nhận thanh toán đơn hàng với phương thức thanh toán đã chọn.
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
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET, COD]
 *                 example: BANK_TRANSFER
 *     responses:
 *       200:
 *         description: Thanh toán thành công
 *       400:
 *         description: Đơn hàng đã thanh toán hoặc dữ liệu không hợp lệ
 */
router.post(
  '/:id/pay',
  orderController.pay
);

/**
 * @openapi
 * /orders/calculate-pricing:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Tính toán cước phí ước tính cho đơn hàng
 *     description: Tính cước phí dựa trên khoảng cách (km), khối lượng (kg), mã dịch vụ, tình trạng dễ vỡ và COD thu hộ.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceCode
 *               - distanceKm
 *               - totalWeightKg
 *             properties:
 *               serviceCode:
 *                 type: string
 *                 example: STANDARD
 *               distanceKm:
 *                 type: number
 *                 example: 5.5
 *               totalWeightKg:
 *                 type: number
 *                 example: 2.0
 *               isFragile:
 *                 type: boolean
 *                 default: false
 *               codAmount:
 *                 type: number
 *                 default: 0
 *     responses:
 *       200:
 *         description: Tính toán cước phí thành công
 */
router.post(
  '/calculate-pricing',
  orderController.calculatePricing
);

export default router;
