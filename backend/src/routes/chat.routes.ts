import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import {
  authMiddleware,
  requireRoles,
  optionalAuthMiddleware,
} from '../middlewares/auth.middleware';

const router = Router();

// ==========================================
// 1. CUSTOMER CHAT ROUTES (OPTIONAL / AUTH)
// ==========================================

/**
 * Lấy toàn bộ tin nhắn của cuộc hội thoại gần nhất
 * GET /api/v1/chat/customer/messages và GET /api/v1/chat/customer/active
 */
router.get('/customer/messages', optionalAuthMiddleware, (req, res) =>
  chatController.getActiveConversation(req, res)
);
router.get('/customer/active', optionalAuthMiddleware, (req, res) =>
  chatController.getActiveConversation(req, res)
);

/**
 * Bắt đầu một cuộc trò chuyện mới
 * POST /api/v1/chat/customer/new
 */
router.post('/customer/new', optionalAuthMiddleware, (req, res) =>
  chatController.createNewConversation(req, res)
);

/**
 * Kiểm tra và xử lý timeout (Shopee Style: 3p nhắc nhở, 5p tự đóng)
 * POST /api/v1/chat/customer/timeout-check
 */
router.post('/customer/timeout-check', optionalAuthMiddleware, (req, res) =>
  chatController.handleTimeoutCheck(req, res)
);

/**
 * Chủ động đóng một cuộc trò chuyện
 * POST /api/v1/chat/customer/close
 */
router.post('/customer/close', optionalAuthMiddleware, (req, res) =>
  chatController.closeConversation(req, res)
);

/**
 * Xác nhận thực hiện hành động ghi (Hủy đơn, Đổi thông tin nhận hàng, Hẹn ngày giao)
 * POST /api/v1/chat/customer/confirm-action
 */
router.post('/customer/confirm-action', optionalAuthMiddleware, (req, res) =>
  chatController.confirmAction(req, res)
);

/**
 * Hủy bỏ yêu cầu hành động đã tạo
 * POST /api/v1/chat/customer/cancel-action
 */
router.post('/customer/cancel-action', optionalAuthMiddleware, (req, res) =>
  chatController.cancelAction(req, res)
);

/**
 * Gửi tin nhắn chat và nhận phản hồi từ AI
 * POST /api/v1/chat/customer
 */
router.post('/customer', optionalAuthMiddleware, (req, res) =>
  chatController.chatCustomer(req, res)
);

// ==========================================
// 2. DRIVER CHAT ROUTES (BẢO MẬT 2 LỚP: authMiddleware + requireRoles(['SHIPPER']))
// ==========================================
const driverAuth = [authMiddleware, requireRoles(['SHIPPER'])];

/**
 * Lấy toàn bộ tin nhắn phiên hoạt động của tài xế
 * GET /api/v1/chat/driver/messages và GET /api/v1/chat/driver/active
 */
router.get('/driver/messages', ...driverAuth, (req, res) =>
  chatController.getActiveConversation(req, res)
);
router.get('/driver/active', ...driverAuth, (req, res) =>
  chatController.getActiveConversation(req, res)
);

/**
 * Tạo phiên trò chuyện mới cho tài xế
 * POST /api/v1/chat/driver/new
 */
router.post('/driver/new', ...driverAuth, (req, res) =>
  chatController.createNewConversation(req, res)
);

/**
 * Xử lý sự kiện timeout cho phiên tài xế (dùng chung logic timeout theo userId)
 * POST /api/v1/chat/driver/timeout-check
 */
router.post('/driver/timeout-check', ...driverAuth, (req, res) =>
  chatController.handleTimeoutCheck(req, res)
);

/**
 * Đóng thủ công phiên trò chuyện của tài xế
 * POST /api/v1/chat/driver/close
 */
router.post('/driver/close', ...driverAuth, (req, res) =>
  chatController.closeConversation(req, res)
);

/**
 * Đếm số tin nhắn chưa đọc gửi tới tài xế
 * GET /api/v1/chat/driver/unread-count
 */
router.get('/driver/unread-count', ...driverAuth, (req, res) =>
  chatController.getDriverUnreadCount(req, res)
);

/**
 * Đánh dấu đã đọc tin nhắn cho tài xế
 * POST /api/v1/chat/driver/mark-read
 */
router.post('/driver/mark-read', ...driverAuth, (req, res) =>
  chatController.markDriverMessagesAsRead(req, res)
);

/**
 * Tài xế nhắn trực tiếp về Nhân viên Kho / Điều phối (không gọi AI LLM)
 * POST /api/v1/chat/driver/reply-staff
 */
router.post('/driver/reply-staff', ...driverAuth, (req, res) =>
  chatController.replyToStaff(req, res)
);

/**
 * Gửi tin nhắn chat và nhận phản hồi từ Trợ lý AI Tài xế
 * POST /api/v1/chat/driver
 */
router.post('/driver', ...driverAuth, (req, res) =>
  chatController.chatDriver(req, res)
);

// ==========================================
// 3. STAFF / ADMIN SUPPORT CHAT ROUTES (NHẮN 2 CHIỀU VỚI TÀI XẾ)
// ==========================================
const staffSupportAuth = [authMiddleware, requireRoles(['ADMIN', 'STAFF'])];

/**
 * Lấy lịch sử trao đổi hỗ trợ gần nhất của một tài xế (kiểm tra đúng kho)
 * GET /api/v1/chat/staff/driver/:driverUserId/messages
 */
router.get('/staff/driver/:driverUserId/messages', ...staffSupportAuth, (req, res) =>
  chatController.getDriverMessagesForStaff(req, res)
);

/**
 * Nhân viên Kho / Admin gửi tin nhắn hỗ trợ xuống tài xế (kiểm tra đúng kho + rate limit)
 * POST /api/v1/chat/staff/send-to-driver
 */
router.post('/staff/send-to-driver', ...staffSupportAuth, (req, res) =>
  chatController.sendMessageToDriver(req, res)
);

export default router;
