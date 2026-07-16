import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto } from '../dtos/auth.dto';

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
 * /auth/verify-otp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Xác thực mã OTP kích hoạt tài khoản
 *     description: Gửi mã OTP đã nhận qua Email để kích hoạt tài khoản Customer và đăng nhập tự động.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Kích hoạt tài khoản thành công, trả về tokens đăng nhập
 *       400:
 *         description: Mã OTP không hợp lệ hoặc đã hết hạn
 */
router.post(
  '/verify-otp',
  rateLimiter(5, 60 * 1000),
  authController.verifyOtp
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

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Thay đổi mật khẩu tài khoản
 *     description: Đổi mật khẩu của người dùng hiện tại đang đăng nhập.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: password123
 *               newPassword:
 *                 type: string
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu cũ không chính xác hoặc mật khẩu mới không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/change-password',
  authMiddleware,
  validationMiddleware(ChangePasswordDto),
  authController.changePassword
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Yêu cầu đặt lại mật khẩu
 *     description: Gửi mã OTP khôi phục mật khẩu vào Email người dùng.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@gmail.com
 *     responses:
 *       200:
 *         description: Đã gửi mã khôi phục mật khẩu thành công
 *       404:
 *         description: Không tìm thấy tài khoản với địa chỉ email này
 */
router.post(
  '/forgot-password',
  rateLimiter(5, 60 * 1000),
  authController.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đặt lại mật khẩu bằng mã OTP
 *     description: Xác thực mã OTP nhận qua email và đặt lại mật khẩu mới cho tài khoản.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: Mã OTP không đúng hoặc đã hết hạn
 *       404:
 *         description: Không tìm thấy tài khoản
 */
router.post(
  '/reset-password',
  rateLimiter(10, 60 * 1000),
  authController.resetPassword
);

export default router;

