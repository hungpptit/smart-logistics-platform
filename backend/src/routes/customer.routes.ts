import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requirePermissions } from '../middlewares/auth.middleware';
import { CreateCustomerDto, UpdateCustomerDto, CreateAddressDto, UpdateAddressDto } from '../dtos/customer.dto';

const router = Router();
const customerController = new CustomerController();

// All customer routes require authentication
router.use(authMiddleware);

/**
 * @openapi
 * /customers:
 *   post:
 *     tags:
 *       - Customers
 *     summary: Tạo hồ sơ Khách hàng mới (Admin/Staff)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - customerType
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               email:
 *                 type: string
 *                 example: anguyen@example.com
 *               phone:
 *                 type: string
 *                 example: 0987654321
 *               customerType:
 *                 type: string
 *                 enum: [INDIVIDUAL, BUSINESS]
 *                 example: INDIVIDUAL
 *               companyName:
 *                 type: string
 *                 example: Công ty TNHH Velocity
 *               taxCode:
 *                 type: string
 *                 example: 0102030405
 *               note:
 *                 type: string
 *                 example: Khách hàng VIP
 *     responses:
 *       201:
 *         description: Tạo khách hàng thành công
 *       403:
 *         description: Không có quyền (Yêu cầu permission CUSTOMER_MANAGE)
 */
router.post(
  '/',
  requirePermissions(['CUSTOMER_MANAGE']),
  validationMiddleware(CreateCustomerDto),
  customerController.create
);

/**
 * @openapi
 * /customers:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Lấy danh sách Khách hàng (Admin/Staff)
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách khách hàng và thông tin phân trang
 *       430:
 *         description: Không có quyền (Yêu cầu permission CUSTOMER_VIEW)
 */
router.get(
  '/',
  requirePermissions(['CUSTOMER_VIEW']),
  customerController.getAll
);

/**
 * @openapi
 * /customers/{id}:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Xem chi tiết thông tin Khách hàng
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
 *         description: Trả về chi tiết thông tin Khách hàng
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.get(
  '/:id',
  customerController.getById
);

/**
 * @openapi
 * /customers/{id}:
 *   put:
 *     tags:
 *       - Customers
 *     summary: Cập nhật thông tin Khách hàng
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
 *               customerType:
 *                 type: string
 *                 enum: [INDIVIDUAL, BUSINESS]
 *               companyName:
 *                 type: string
 *               taxCode:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BLOCKED]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.put(
  '/:id',
  validationMiddleware(UpdateCustomerDto),
  customerController.update
);

/**
 * @openapi
 * /customers/{id}:
 *   delete:
 *     tags:
 *       - Customers
 *     summary: Xóa Khách hàng (Soft-delete)
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
 *         description: Xóa khách hàng thành công
 *       400:
 *         description: Không thể xóa vì khách hàng đang có đơn hàng hoạt động
 */
router.delete(
  '/:id',
  requirePermissions(['CUSTOMER_MANAGE']),
  customerController.delete
);

// --- Address Book Routes ---

/**
 * @openapi
 * /customers/{id}/addresses:
 *   post:
 *     tags:
 *       - Address Book
 *     summary: Thêm địa chỉ mới vào Sổ địa chỉ
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
 *               - addressLine1
 *               - ward
 *               - province
 *               - addressType
 *             properties:
 *               addressLine1:
 *                 type: string
 *                 example: 123 Đường Nguyễn Huệ
 *               addressLine2:
 *                 type: string
 *               ward:
 *                 type: string
 *                 example: Phường Bến Nghé
 *               province:
 *                 type: string
 *                 example: Thành phố Hồ Chí Minh
 *               wardCode:
 *                 type: string
 *                 example: 26734
 *               addressType:
 *                 type: string
 *                 enum: [HOME, OFFICE, WAREHOUSE, RETURN]
 *                 example: HOME
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Thêm địa chỉ thành công
 */
router.post(
  '/:id/addresses',
  validationMiddleware(CreateAddressDto),
  customerController.addAddress
);

/**
 * @openapi
 * /customers/{id}/addresses:
 *   get:
 *     tags:
 *       - Address Book
 *     summary: Lấy danh sách địa chỉ trong Sổ địa chỉ
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
 *         description: Danh sách địa chỉ đã lưu
 */
router.get(
  '/:id/addresses',
  customerController.getAddresses
);

/**
 * @openapi
 * /customers/{id}/addresses/{addressId}:
 *   put:
 *     tags:
 *       - Address Book
 *     summary: Cập nhật địa chỉ trong Sổ địa chỉ
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
 *         name: addressId
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
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               ward:
 *                 type: string
 *               province:
 *                 type: string
 *               wardCode:
 *                 type: string
 *               addressType:
 *                 type: string
 *                 enum: [HOME, OFFICE, WAREHOUSE, RETURN]
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:id/addresses/:addressId',
  validationMiddleware(UpdateAddressDto),
  customerController.updateAddress
);

/**
 * @openapi
 * /customers/{id}/addresses/{addressId}:
 *   delete:
 *     tags:
 *       - Address Book
 *     summary: Xóa địa chỉ khỏi Sổ địa chỉ
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
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa địa chỉ thành công
 */
router.delete(
  '/:id/addresses/:addressId',
  customerController.deleteAddress
);

export default router;
