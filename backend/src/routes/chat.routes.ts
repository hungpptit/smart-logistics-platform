import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { optionalAuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Áp dụng optional auth cho toàn bộ router chat để tự động nhận diện danh tính khách hàng
router.use(optionalAuthMiddleware);

/**
 * Lấy toàn bộ tin nhắn của cuộc hội thoại gần nhất (hỗ trợ F5 reload)
 * GET /api/v1/chat/customer/messages và GET /api/v1/chat/customer/active
 */
router.get('/customer/messages', (req, res) => chatController.getActiveConversation(req, res));
router.get('/customer/active', (req, res) => chatController.getActiveConversation(req, res));

/**
 * Bắt đầu một cuộc trò chuyện mới
 * POST /api/v1/chat/customer/new
 */
router.post('/customer/new', (req, res) => chatController.createNewConversation(req, res));

/**
 * Kiểm tra và xử lý timeout (Shopee Style: 3p nhắc nhở, 5p tự đóng)
 * POST /api/v1/chat/customer/timeout-check
 */
router.post('/customer/timeout-check', (req, res) => chatController.handleTimeoutCheck(req, res));

/**
 * Chủ động đóng một cuộc trò chuyện
 * POST /api/v1/chat/customer/close
 */
router.post('/customer/close', (req, res) => chatController.closeConversation(req, res));

/**
 * Gửi tin nhắn chat và nhận phản hồi từ AI (tự động lưu vào ChatConversation & ChatMessage)
 * POST /api/v1/chat/customer
 */
router.post('/customer', (req, res) => chatController.chatCustomer(req, res));

export default router;
