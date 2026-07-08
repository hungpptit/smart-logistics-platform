import { Router } from 'express';
import { FacilityController } from '../controllers/facility.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateFacilityDto, UpdateFacilityDto, CreateFacilityZoneDto, UpdateFacilityZoneDto } from '../dtos/facility.dto';

const router = Router();
const facilityController = new FacilityController();

// All facility routes require authentication and STAFF/ADMIN role
router.use(authMiddleware);
router.use(requireRoles(['ADMIN', 'STAFF']));

/**
 * @openapi
 * /facilities:
 *   post:
 *     tags:
 *       - Facilities
 *     summary: Tạo bưu cục/kho bãi mới
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - facilityCode
 *               - facilityName
 *               - facilityTypeId
 *               - addressLine1
 *               - ward
 *               - province
 *             properties:
 *               facilityCode:
 *                 type: string
 *                 example: HUB-HCM-01
 *               facilityName:
 *                 type: string
 *                 example: Tổng kho Tân Bình
 *               facilityTypeId:
 *                 type: string
 *                 format: uuid
 *                 example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
 *               parentFacilityId:
 *                 type: string
 *                 format: uuid
 *                 example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e
 *               addressLine1:
 *                 type: string
 *                 example: 45 Trường Sơn
 *               addressLine2:
 *                 type: string
 *               ward:
 *                 type: string
 *                 example: Phường 2
 *               province:
 *                 type: string
 *                 example: Thành phố Hồ Chí Minh
 *               wardCode:
 *                 type: string
 *                 example: 26890
 *     responses:
 *       201:
 *         description: Tạo bưu cục thành công
 */
router.post(
  '/',
  validationMiddleware(CreateFacilityDto),
  facilityController.create
);

/**
 * @openapi
 * /facilities:
 *   get:
 *     tags:
 *       - Facilities
 *     summary: Lấy danh sách toàn bộ bưu cục/kho bãi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bưu cục kèm thông tin loại bưu cục
 */
router.get(
  '/',
  facilityController.getAll
);

/**
 * @openapi
 * /facilities/types:
 *   get:
 *     tags:
 *       - Facilities
 *     summary: Lấy danh sách các loại hình bưu cục (Hub, Hub chặng cuối, Điểm giao nhận...)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách loại hình bưu cục
 */
router.get(
  '/types',
  facilityController.getTypes
);

/**
 * @openapi
 * /facilities/{id}:
 *   get:
 *     tags:
 *       - Facilities
 *     summary: Lấy chi tiết thông tin bưu cục
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
 *         description: Trả về chi tiết thông tin bưu cục kèm địa chỉ và thông tin kho cha/kho con.
 */
router.get(
  '/:id',
  facilityController.getById
);

/**
 * @openapi
 * /facilities/{id}:
 *   put:
 *     tags:
 *       - Facilities
 *     summary: Cập nhật thông tin bưu cục
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
 *               facilityName:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               addressLine1:
 *                 type: string
 *               ward:
 *                 type: string
 *               province:
 *                 type: string
 *               wardCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:id',
  validationMiddleware(UpdateFacilityDto),
  facilityController.update
);

/**
 * @openapi
 * /facilities/{id}:
 *   delete:
 *     tags:
 *       - Facilities
 *     summary: Xóa bưu cục (Soft-delete)
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
 *         description: Xóa bưu cục thành công
 *       400:
 *         description: Không thể xóa vì bưu cục đang có bưu cục con trực thuộc hoặc có tuyến hoạt động.
 */
router.delete(
  '/:id',
  facilityController.delete
);

// --- Cargo Zone Routes ---

/**
 * @openapi
 * /facilities/{id}/zones:
 *   post:
 *     tags:
 *       - Cargo Zones
 *     summary: Tạo một phân khu lưu trữ hàng hóa mới trong bưu cục
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
 *               - zoneCode
 *               - zoneName
 *               - zoneType
 *               - maxWeightKg
 *             properties:
 *               zoneCode:
 *                 type: string
 *                 example: ZONE-REC
 *               zoneName:
 *                 type: string
 *                 example: Khu vực nhận hàng
 *               zoneType:
 *                 type: string
 *                 enum: [RECEIVING, SORTING, STORAGE, DISPATCH, COLD_STORAGE, FRAGILE, DANGEROUS]
 *                 example: RECEIVING
 *               maxWeightKg:
 *                 type: number
 *                 example: 5000
 *     responses:
 *       201:
 *         description: Tạo phân khu thành công
 */
router.post(
  '/:id/zones',
  validationMiddleware(CreateFacilityZoneDto),
  facilityController.createZone
);

/**
 * @openapi
 * /facilities/{id}/zones:
 *   get:
 *     tags:
 *       - Cargo Zones
 *     summary: Lấy danh sách toàn bộ các phân khu trong bưu cục
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
 *         description: Danh sách phân khu lưu kho
 */
router.get(
  '/:id/zones',
  facilityController.getZones
);

/**
 * @openapi
 * /facilities/{id}/zones/{zoneId}:
 *   put:
 *     tags:
 *       - Cargo Zones
 *     summary: Cập nhật thông tin phân khu lưu kho
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: zoneId
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
 *               zoneName:
 *                 type: string
 *               maxWeightKg:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, FULL]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:id/zones/:zoneId',
  validationMiddleware(UpdateFacilityZoneDto),
  facilityController.updateZone
);

/**
 * @openapi
 * /facilities/{id}/zones/{zoneId}:
 *   delete:
 *     tags:
 *       - Cargo Zones
 *     summary: Xóa phân khu lưu kho
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa phân khu thành công
 */
router.delete(
  '/:id/zones/:zoneId',
  facilityController.deleteZone
);

export default router;
