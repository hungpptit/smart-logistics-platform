import { Router } from 'express';
import { cameraController } from '../controllers/camera.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

// 🛡️ BẢO MẬT & PHÂN QUYỀN CHẶT CHẼ
// 1. Bắt buộc phải đăng nhập (JWT hợp lệ)
router.use(authMiddleware);

// 2. Chỉ cho phép ADMIN và SHIPPER (Tài xế giao hàng)
// CUSTOMER, STAFF và các vai trò khác bị chặn hoàn toàn -> 403 Forbidden
router.use(requireRoles(['ADMIN', 'SHIPPER']));

// GET /api/v1/cameras - Lấy danh sách camera
router.get('/', cameraController.getCameras);

// GET /api/v1/cameras/:idOrCode - Lấy chi tiết camera
router.get('/:idOrCode', cameraController.getCameraDetail);

export default router;
