import { Response } from 'express';
import { prisma } from '../config/prisma';
import { chatConversationService } from '../services/ai/chat_conversation.service';
import { customerAgentService } from '../services/ai/customer_agent.service';
import { driverAgentService } from '../services/ai/driver_agent.service';
import { executeConfirmedAction } from '../services/ai/tools/customer_action.tools';
import { actionTokenService } from '../services/ai/action_token.service';
import {
  ChatMessageInputSchema,
  ReplyStaffInputSchema,
  SendStaffDriverMessageSchema,
} from '../dtos/chat_validation.dto';
import { securityAuditService } from '../services/ai/security_audit.service';
import { z, ZodError } from 'zod';

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
      // 1. Kiểm tra giới hạn tần suất gửi tin nhắn (20 requests / phút / user)
      const rateLimit = securityAuditService.checkChatRateLimit(req.user?.id);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          message: `Quý khách đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ${rateLimit.retryAfterSec || 10} giây.`,
        });
        return;
      }

      const parseResult = ChatMessageInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || 'Dữ liệu tin nhắn không hợp lệ.';
        res.status(400).json({
          success: false,
          message: firstError,
        });
        return;
      }

      const { message, image, conversationId, conversationHistory } = parseResult.data;

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
   * Chat hỗ trợ Tài xế kết hợp RAG cẩm nang nghiệp vụ và xử lý sự cố tuyến đường
   * POST /api/v1/chat/driver
   */
  public async chatDriver(req: any, res: Response): Promise<void> {
    try {
      // 1. Kiểm tra giới hạn tần suất gửi tin nhắn (20 requests / phút / user)
      const rateLimit = securityAuditService.checkChatRateLimit(req.user?.id);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          message: `Bác tài đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ${rateLimit.retryAfterSec || 10} giây.`,
        });
        return;
      }

      const parseResult = ChatMessageInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || 'Dữ liệu tin nhắn không hợp lệ.';
        res.status(400).json({
          success: false,
          message: firstError,
        });
        return;
      }

      const { message, image, conversationId, conversationHistory } = parseResult.data;

      const result = await driverAgentService.handleDriverMessage({
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
      console.error('[ChatController] Lỗi khi xử lý chat tài xế:', error);
      const status = error.status || error.statusCode || 500;
      res.status(status).json({
        success: false,
        message: error.message || 'Đã có lỗi xảy ra trong quá trình xử lý câu trả lời từ AI.',
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
      const { token, actionType, customCoordinates } = req.body;
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

      const result = await executeConfirmedAction(token, actionType, customer.id, req.user.id, customCoordinates);

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

  private handleControllerError(res: Response, error: any, fallbackMessage: string): void {
    if (error instanceof ZodError) {
      const firstIssue = error.issues?.[0]?.message || 'Dữ liệu đầu vào không hợp lệ.';
      res.status(400).json({
        success: false,
        message: firstIssue,
        error: firstIssue,
      });
      return;
    }

    const status = error?.status || error?.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error?.message || fallbackMessage,
      error: error?.message,
    });
  }

  /**
   * Đếm số tin nhắn chưa đọc của tài xế
   * GET /api/v1/chat/driver/unread-count
   */
  public async getDriverUnreadCount(req: any, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Chưa xác thực tài khoản.' });
        return;
      }

      const unreadCount = await chatConversationService.getDriverUnreadCount(req.user.id);
      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi đếm tin chưa đọc của tài xế:', error);
      this.handleControllerError(res, error, 'Không thể đếm tin nhắn chưa đọc.');
    }
  }

  /**
   * Đánh dấu các tin nhắn chưa đọc của tài xế là đã đọc
   * POST /api/v1/chat/driver/mark-read
   */
  public async markDriverMessagesAsRead(req: any, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Chưa xác thực tài khoản.' });
        return;
      }

      const rawConvId = req.body?.conversationId;
      const conversationId =
        typeof rawConvId === 'string' && rawConvId.trim()
          ? z.string().uuid('conversationId không hợp lệ').parse(rawConvId.trim())
          : undefined;

      const unreadCount = await chatConversationService.markDriverMessagesAsRead(
        req.user.id,
        conversationId
      );
      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi đánh dấu đã đọc tin tài xế:', error);
      this.handleControllerError(res, error, 'Không thể cập nhật trạng thái đã đọc.');
    }
  }

  /**
   * Tài xế nhắn trực tiếp về Nhân viên Kho / Điều phối (không gọi AI LLM)
   * POST /api/v1/chat/driver/reply-staff
   */
  public async replyToStaff(req: any, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Chưa xác thực tài khoản.' });
        return;
      }

      const rateLimit = securityAuditService.checkChatRateLimit(req.user.id);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          message: `Bạn gửi tin quá nhanh. Vui lòng thử lại sau ${rateLimit.retryAfterSec || 30} giây.`,
        });
        return;
      }

      const parsed = ReplyStaffInputSchema.parse(req.body);
      const saved = await chatConversationService.replyToStaffByDriver({
        driverUserId: req.user.id,
        message: parsed.message,
        image: parsed.image,
        conversationId: parsed.conversationId,
      });

      res.status(200).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi tài xế phản hồi nhân viên:', error);
      this.handleControllerError(res, error, 'Không thể gửi tin nhắn cho điều phối viên.');
    }
  }

  /**
   * Nhân viên Kho / Admin xem lịch sử chat của một tài xế
   * GET /api/v1/chat/staff/driver/:driverUserId/messages
   */
  public async getDriverMessagesForStaff(req: any, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Chưa xác thực tài khoản.' });
        return;
      }

      const driverUserId = z
        .string()
        .uuid('driverUserId không hợp lệ')
        .parse(req.params?.driverUserId);

      const data = await chatConversationService.getDriverConversationForStaff({
        staffUserId: req.user.id,
        staffRoles: req.user.roles || [],
        driverUserId,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi tải lịch sử hỗ trợ tài xế:', error);
      this.handleControllerError(res, error, 'Không thể tải lịch sử chat tài xế.');
    }
  }

  /**
   * Nhân viên Kho / Admin gửi tin nhắn hỗ trợ 2 chiều xuống tài xế
   * POST /api/v1/chat/staff/send-to-driver
   */
  public async sendMessageToDriver(req: any, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Chưa xác thực tài khoản.' });
        return;
      }

      const rateLimit = securityAuditService.checkChatRateLimit(req.user.id);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          message: `Bạn gửi tin quá nhanh. Vui lòng thử lại sau ${rateLimit.retryAfterSec || 30} giây.`,
        });
        return;
      }

      const parsed = SendStaffDriverMessageSchema.parse(req.body);
      const data = await chatConversationService.sendMessageFromStaffToDriver({
        staffUserId: req.user.id,
        staffUsername: req.user.username,
        staffRoles: req.user.roles || [],
        driverUserId: parsed.driverUserId,
        message: parsed.message,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi nhân viên gửi tin cho tài xế:', error);
      this.handleControllerError(res, error, 'Không thể gửi tin nhắn tới tài xế.');
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
