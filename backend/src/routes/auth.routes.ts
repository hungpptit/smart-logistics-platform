import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dtos/auth.dto';

const router = Router();
const authController = new AuthController();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng ký tài khoản Khách hàng mới
 *     description: Tạo một tài khoản người dùng mới với vai trò CUSTOMER và tạo hồ sơ Khách hàng đi kèm.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: customer123
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               phone:
 *                 type: string
 *                 example: 0987654321
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Tên đăng nhập/email đã tồn tại hoặc dữ liệu đầu vào không hợp lệ
 */
router.post(
  '/register',
  rateLimiter(5, 60 * 1000),
  validationMiddleware(RegisterDto),
  authController.register
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng nhập hệ thống
 *     description: Xác thực bằng email và mật khẩu để lấy access token và refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@slp.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về tokens
 *       401:
 *         description: Sai thông tin đăng nhập hoặc tài khoản bị khóa
 */
router.post(
  '/login',
  rateLimiter(10, 60 * 1000),
  validationMiddleware(LoginDto),
  authController.login
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Làm mới Access Token
 *     description: Gửi refresh token để nhận access token mới khi access token cũ hết hạn.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Cấp access token mới thành công
 *       401:
 *         description: Refresh token không hợp lệ hoặc hết hạn
 */
router.post(
  '/refresh',
  validationMiddleware(RefreshTokenDto),
  authController.refresh
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng xuất hệ thống
 *     description: Đăng xuất tài khoản, đưa access token hiện tại vào blacklist trên Redis.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Lấy thông tin tài khoản hiện tại
 *     description: Trả về thông tin chi tiết và danh sách quyền hạn (RBAC) của tài khoản đang đăng nhập.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/me',
  authMiddleware,
  authController.getProfile
);

export default router;
