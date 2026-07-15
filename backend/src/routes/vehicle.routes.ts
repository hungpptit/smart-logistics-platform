import { Router } from 'express';
import { VehicleController } from '../controllers/vehicle.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateVehicleDto, UpdateVehicleDto } from '../dtos/vehicle.dto';

const router = Router();
const vehicleController = new VehicleController();

// Require auth for all vehicle management operations
router.use(authMiddleware);

/**
 * @openapi
 * /vehicles/types:
 *   get:
 *     tags:
 *       - Vehicles
 *     summary: Lấy danh sách phân loại xe
 *     description: Trả về danh sách tất cả các loại phương tiện được hỗ trợ trong hệ thống (Xe máy, Xe Van, Xe tải, Container...).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/types',
  requireRoles(['ADMIN', 'STAFF']),
  vehicleController.getTypes
);

/**
 * @openapi
 * /vehicles:
 *   get:
 *     tags:
 *       - Vehicles
 *     summary: Lấy danh sách phương tiện
 *     description: Lấy danh sách xe kèm bộ lọc phân trang, tìm kiếm theo biển số, mã xe, trạng thái, hoặc kho bãi quản lý.
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo biển số hoặc mã phương tiện
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Lọc theo trạng thái hoạt động (ACTIVE, MAINTENANCE, RETIRED)
 *       - in: query
 *         name: facilityId
 *         schema:
 *           type: string
 *         description: Lọc theo ID kho bãi trực thuộc
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/',
  requireRoles(['ADMIN', 'STAFF']),
  vehicleController.getAll
);

/**
 * @openapi
 * /vehicles/{id}:
 *   get:
 *     tags:
 *       - Vehicles
 *     summary: Lấy chi tiết thông tin phương tiện
 *     description: Trả về thông tin chi tiết của một chiếc xe bao gồm loại xe, kho bãi quản lý và tài xế đang được gán (nếu có).
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
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Không tìm thấy phương tiện
 */
router.get(
  '/:id',
  requireRoles(['ADMIN', 'STAFF']),
  vehicleController.getById
);

/**
 * @openapi
 * /vehicles:
 *   post:
 *     tags:
 *       - Vehicles
 *     summary: Tạo phương tiện vận chuyển mới
 *     description: Đăng ký xe mới trực thuộc hệ thống điều vận (Chỉ ADMIN).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleCode
 *               - licensePlate
 *               - vehicleTypeId
 *               - maxWeight
 *               - maxVolume
 *             properties:
 *               vehicleCode:
 *                 type: string
 *                 example: VAN-HB01
 *               licensePlate:
 *                 type: string
 *                 example: 29C-88888
 *               vehicleTypeId:
 *                 type: string
 *                 format: uuid
 *                 example: d290f1ee-6c54-4b01-90e6-d701748f0851
 *               homeFacilityId:
 *                 type: string
 *                 format: uuid
 *                 example: d290f1ee-6c54-4b01-90e6-d701748f0852
 *               maxWeight:
 *                 type: number
 *                 example: 500.0
 *               maxVolume:
 *                 type: number
 *                 example: 1.2
 *               maxLength:
 *                 type: number
 *                 example: 2.2
 *               refrigerationSupported:
 *                 type: boolean
 *                 example: false
 *               gpsDeviceId:
 *                 type: string
 *                 example: GPS-VAN-HB01
 *     responses:
 *       201:
 *         description: Tạo mới thành công
 *       400:
 *         description: Biển số hoặc mã xe đã tồn tại
 */
router.post(
  '/',
  requireRoles(['ADMIN']),
  validationMiddleware(CreateVehicleDto),
  vehicleController.create
);

/**
 * @openapi
 * /vehicles/{id}:
 *   put:
 *     tags:
 *       - Vehicles
 *     summary: Cập nhật thông tin phương tiện
 *     description: Cập nhật trạng thái bảo trì, mã thiết bị GPS hoặc tải trọng của xe (Chỉ ADMIN).
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
 *             properties:
 *               vehicleCode:
 *                 type: string
 *                 example: VAN-HB01-REV
 *               operatingStatus:
 *                 type: string
 *                 example: MAINTENANCE
 *               gpsDeviceId:
 *                 type: string
 *                 example: GPS-NEW-01
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy phương tiện
 */
router.put(
  '/:id',
  requireRoles(['ADMIN']),
  validationMiddleware(UpdateVehicleDto),
  vehicleController.update
);

/**
 * @openapi
 * /vehicles/{id}:
 *   delete:
 *     tags:
 *       - Vehicles
 *     summary: Xóa phương tiện khỏi hệ thống
 *     description: Xóa vật lý xe khỏi cơ sở dữ liệu nếu xe không có lịch sử phân công tài xế hoạt động (Chỉ ADMIN).
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
 *         description: Không thể xóa xe đang được phân công cho tài xế
 *       404:
 *         description: Không tìm thấy phương tiện
 */
router.delete(
  '/:id',
  requireRoles(['ADMIN']),
  vehicleController.delete
);

export default router;
