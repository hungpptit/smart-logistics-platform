import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';

const router = Router();

/**
 * @openapi
 * /chat/customer:
 *   post:
 *     tags:
 *       - AI Chatbot
 *     summary: Hỏi đáp trợ lý AI CSKH dựa trên kho tri thức RAG
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Làm thế nào để huỷ đơn hàng?
 *               conversationHistory:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Phản hồi từ trợ lý AI và nguồn trích dẫn
 */
router.post('/customer', (req, res) => chatController.chatCustomer(req, res));

export default router;

