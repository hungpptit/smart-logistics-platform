import { Router } from 'express';
import { SettingController } from '../controllers/setting.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new SettingController();

/**
 * @openapi
 * /settings/gps-interval:
 *   get:
 *     tags:
 *       - Settings
 *     summary: Lấy chu kỳ đồng bộ GPS của shipper
 *     description: "Trả về thời gian chu kỳ gửi tọa độ GPS từ mobile app lên server (đơn vị: giây)."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về chu kỳ giây thành công
 */
router.get('/gps-interval', authMiddleware, controller.getGPSInterval);

/**
 * @openapi
 * /settings:
 *   get:
 *     tags:
 *       - Settings
 *     summary: Lấy toàn bộ tham số cấu hình hệ thống đang kích hoạt
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách tham số cấu hình
 */
router.get('/', authMiddleware, controller.getAllSettings);

export default router;
