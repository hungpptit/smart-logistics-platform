import { Response } from 'express';
import { prisma } from '../config/prisma';
import { chatConversationService } from '../services/ai/chat_conversation.service';
import { customerAgentService } from '../services/ai/customer_agent.service';
import { executeConfirmedAction } from '../services/ai/tools/customer_action.tools';
import { actionTokenService } from '../services/ai/action_token.service';

export class ChatController {
  /**
   * Lấy cuộc trò chuyện đang hoạt động gần nhất của khách hàng (kèm lịch sử tin nhắn)
   * GET /api/v1/chat/customer/active hoặc GET /api/v1/chat/customer/messages
   */
  public async getActiveConversation(req: any, res: Response): Promise<void> {
    try {
      const data = await chatConversationService.getActiveConversation(req.user?.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi lấy cuộc trò chuyện active:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể tải lịch sử cuộc trò chuyện.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo một cuộc trò chuyện mới (New Chat Session)
   * POST /api/v1/chat/customer/new
   */
  public async createNewConversation(req: any, res: Response): Promise<void> {
    try {
      const data = await chatConversationService.createNewConversation(req.user?.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi tạo cuộc trò chuyện mới:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể tạo cuộc trò chuyện mới.',
        error: error.message,
      });
    }
  }

  /**
   * Xử lý sự kiện Timeout từ Frontend (Shopee CSKH Style: 3p nhắc nhở, 5p đóng phiên)
   * POST /api/v1/chat/customer/timeout-check
   */
  public async handleTimeoutCheck(req: any, res: Response): Promise<void> {
    try {
      const { conversationId, action } = req.body;
      if (!conversationId || !action) {
        res.status(400).json({ success: false, message: 'Thiếu conversationId hoặc action.' });
        return;
      }

      const result = await chatConversationService.handleTimeoutCheck(conversationId, action);
      if (result.status && result.status >= 400) {
        res.status(result.status).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi xử lý timeout check:', error);
      res.status(500).json({ success: false, message: 'Lỗi server xử lý timeout.', error: error.message });
    }
  }

  /**
   * Đóng thủ công cuộc trò chuyện
   * POST /api/v1/chat/customer/close
   */
  public async closeConversation(req: any, res: Response): Promise<void> {
    try {
      const { conversationId } = req.body;
      if (!conversationId) {
        res.status(400).json({ success: false, message: 'Thiếu conversationId.' });
        return;
      }

      const result = await chatConversationService.closeConversation(conversationId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi đóng cuộc trò chuyện:', error);
      res.status(500).json({ success: false, message: 'Không thể đóng cuộc trò chuyện.', error: error.message });
    }
  }

  /**
   * Chat hỗ trợ Khách hàng kết hợp Agentic Function Calling (Tools) & RAG Knowledge Base
   * POST /api/v1/chat/customer
   */
  public async chatCustomer(req: any, res: Response): Promise<void> {
    try {
      const { message, image, conversationId, conversationHistory } = req.body;

      if ((!message || typeof message !== 'string' || !message.trim()) && (!image || typeof image !== 'string')) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp nội dung tin nhắn hoặc đính kèm hình ảnh.',
        });
        return;
      }

      const result = await customerAgentService.handleCustomerMessage({
        userId: req.user?.id,
        message,
        image,
        conversationId,
        conversationHistory,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi xử lý chat khách hàng:', error);
      res.status(500).json({
        success: false,
        message: 'Đã có lỗi xảy ra trong quá trình xử lý câu trả lời từ AI.',
        error: error.message,
      });
    }
  }

  /**
   * Xác nhận thực hiện hành động ghi (Hủy đơn, Đổi thông tin nhận hàng, Hẹn ngày giao)
   * POST /api/v1/chat/customer/confirm-action
   */
  public async confirmAction(req: any, res: Response): Promise<void> {
    try {
      const { token, actionType } = req.body;
      if (!token || !actionType) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mã xác nhận (token) và loại hành động (actionType).',
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Quý khách vui lòng đăng nhập để xác nhận thực hiện hành động này.',
        });
        return;
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.id },
      });

      if (!customer) {
        res.status(403).json({
          success: false,
          message: 'Không tìm thấy hồ sơ khách hàng tương ứng với tài khoản này.',
        });
        return;
      }

      const result = await executeConfirmedAction(token, actionType, customer.id, req.user.id);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi xác nhận hành động:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể xác nhận hành động lúc này. Vui lòng thử lại sau.',
        error: error.message,
      });
    }
  }

  /**
   * Hủy bỏ yêu cầu hành động đã tạo
   * POST /api/v1/chat/customer/cancel-action
   */
  public async cancelAction(req: any, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (token && typeof token === 'string') {
        await actionTokenService.revokeToken(token);
      }

      res.status(200).json({
        success: true,
        message: 'Đã hủy bỏ yêu cầu xác nhận.',
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi hủy bỏ hành động:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi hủy bỏ hành động.',
        error: error.message,
      });
    }
  }
}

export const chatController = new ChatController();
