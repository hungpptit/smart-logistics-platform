import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';

const router = Router();
const serviceController = new ServiceController();

/**
 * @openapi
 * /services:
 *   get:
 *     tags:
 *       - Shipping Services
 *     summary: Lấy danh sách các gói dịch vụ vận chuyển đang hoạt động
 *     description: Trả về danh sách các loại hình gói dịch vụ (EXPRESS, STANDARD, SAVING, COLD_CHAIN) kèm thông tin cơ bản về giá và định mức hỗ trợ khoảng cách/khối lượng.
 *     responses:
 *       200:
 *         description: Danh sách gói dịch vụ
 */
router.get('/', serviceController.getAll);

export default router;
