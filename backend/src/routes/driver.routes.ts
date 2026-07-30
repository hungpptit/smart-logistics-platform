import { Router } from 'express';
import { DriverController } from '../controllers/driver.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateDriverDto, UpdateDriverDto } from '../dtos/driver.dto';
import { AssignVehicleDto, TerminateAssignmentDto } from '../dtos/assignment.dto';

const router = Router();
const driverController = new DriverController();

// Driver Duty Status Toggle (Available for SHIPPER / DRIVER / STAFF / ADMIN)
router.patch(
  '/duty-status',
  authMiddleware,
  requireRoles(['SHIPPER', 'DRIVER', 'STAFF', 'ADMIN']),
  driverController.updateDutyStatus
);

// Require auth and specific roles for administrative driver management operations
router.use(authMiddleware);
router.use(requireRoles(['ADMIN', 'STAFF']));

router.post(
  '/',
  validationMiddleware(CreateDriverDto),
  driverController.create
);

router.get(
  '/',
  driverController.getAll
);

router.get(
  '/unlinked-users/shipper',
  driverController.getUnlinkedUsers
);

router.get(
  '/:id',
  driverController.getById
);

router.put(
  '/:id',
  validationMiddleware(UpdateDriverDto),
  driverController.update
);

router.delete(
  '/:id',
  driverController.delete
);

// Vehicle assignment sub-routes
/**
 * @openapi
 * /drivers/assignments:
 *   post:
 *     tags:
 *       - Drivers
 *     summary: Phân công phương tiện cho tài xế
 *     description: Gán một chiếc xe cho tài xế với các kiểm duyệt an toàn (Trạng thái hoạt động ACTIVE, so khớp hạng bằng lái và tự động ngắt liên kết cũ của cả 2 để giữ quan hệ 1-1).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *               - vehicleId
 *             properties:
 *               driverId:
 *                 type: string
 *                 format: uuid
 *                 example: d290f1ee-6c54-4b01-90e6-d701748f0851
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 example: d290f1ee-6c54-4b01-90e6-d701748f0852
 *     responses:
 *       201:
 *         description: Phân công thành công
 *       400:
 *         description: Trạng thái tài xế/xe không hoạt động hoặc không đủ điều kiện hạng bằng lái
 */
router.post(
  '/assignments',
  validationMiddleware(AssignVehicleDto),
  driverController.assignVehicle
);

/**
 * @openapi
 * /drivers/assignments/terminate:
 *   post:
 *     tags:
 *       - Drivers
 *     summary: Hủy phân công phương tiện (Thu hồi xe)
 *     description: Ngắt liên kết hoạt động giữa tài xế và chiếc xe đang gán hiện tại.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: string
 *                 format: uuid
 *                 example: d290f1ee-6c54-4b01-90e6-d701748f0851
 *     responses:
 *       200:
 *         description: Thu hồi thành công
 *       404:
 *         description: Tài xế hiện tại không có xe nào đang gán
 */
router.post(
  '/assignments/terminate',
  validationMiddleware(TerminateAssignmentDto),
  driverController.terminateAssignment
);

/**
 * @openapi
 * /drivers/assignments/active:
 *   get:
 *     tags:
 *       - Drivers
 *     summary: Lấy danh sách phân công tài xế - xe đang hoạt động
 *     description: Trả về danh sách tất cả các cặp gán xe đang hoạt động trên hệ thống.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/assignments/active',
  driverController.getActiveAssignments
);

export default router;
