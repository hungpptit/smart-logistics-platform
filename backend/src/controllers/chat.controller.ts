import { Response } from 'express';
import { prisma } from '../config/prisma';
import { RequestWithUser } from '../middlewares/auth.middleware';
import { ragService } from '../services/ai/rag.service';
import { nvidiaAIService } from '../services/ai/nvidia.service';

const REMINDER_MESSAGE = 'Dạ không biết quý khách còn thắc mắc hay cần Velocity hỗ trợ thêm thông tin gì nữa không ạ?';
const CLOSING_MESSAGE = 'Do không nhận được phản hồi từ quý khách, Velocity xin phép đóng phiên hỗ trợ này. Cảm ơn quý khách đã tin tưởng và đồng hành cùng Velocity Logistics. Chúc quý khách một ngày tốt lành! Quý khách có thể gửi tin nhắn mới bất cứ lúc nào để bắt đầu phiên hỗ trợ mới.';

export class ChatController {
  /**
   * Lấy cuộc trò chuyện đang hoạt động gần nhất của khách hàng (kèm lịch sử tin nhắn)
   * GET /api/v1/chat/customer/active
   */
  public async getActiveConversation(req: any, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(200).json({
          success: true,
          data: { conversationId: null, status: 'NEW', isClosed: false, messages: [] },
        });
        return;
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.id },
      });

      if (!customer) {
        res.status(200).json({
          success: true,
          data: { conversationId: null, status: 'NEW', isClosed: false, messages: [] },
        });
        return;
      }

      let activeConv = await prisma.chatConversation.findFirst({
        where: { customerId: customer.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!activeConv) {
        res.status(200).json({
          success: true,
          data: { conversationId: null, status: 'NEW', isClosed: false, messages: [] },
        });
        return;
      }

      let isClosed = activeConv.status === 'CLOSED';

      // Xử lý Timeout tự động trên Server (Shopee Style: 3p hỏi thăm, 5p tự đóng)
      if (!isClosed && activeConv.messages.length > 0) {
        const lastMsg = activeConv.messages[activeConv.messages.length - 1];
        if (lastMsg.role === 'ASSISTANT') {
          const elapsedMs = Date.now() - new Date(lastMsg.createdAt).getTime();
          const THREE_MINUTES = 3 * 60 * 1000;
          const FIVE_MINUTES = 5 * 60 * 1000;

          if (elapsedMs >= FIVE_MINUTES) {
            const hasReminder = activeConv.messages.some((m) => m.content === REMINDER_MESSAGE);
            if (!hasReminder) {
              await prisma.chatMessage.create({
                data: {
                  conversationId: activeConv.id,
                  role: 'ASSISTANT',
                  content: REMINDER_MESSAGE,
                  status: 'SENT',
                  createdAt: new Date(new Date(lastMsg.createdAt).getTime() + THREE_MINUTES),
                },
              });
            }

            const hasClosing = activeConv.messages.some((m) => m.content === CLOSING_MESSAGE);
            if (!hasClosing) {
              await prisma.chatMessage.create({
                data: {
                  conversationId: activeConv.id,
                  role: 'ASSISTANT',
                  content: CLOSING_MESSAGE,
                  status: 'SENT',
                  createdAt: new Date(new Date(lastMsg.createdAt).getTime() + FIVE_MINUTES),
                },
              });
            }

            await prisma.chatConversation.update({
              where: { id: activeConv.id },
              data: {
                status: 'CLOSED',
                closedAt: new Date(),
              },
            });

            isClosed = true;

            activeConv = (await prisma.chatConversation.findUnique({
              where: { id: activeConv.id },
              include: {
                messages: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            })) as any;
          } else if (elapsedMs >= THREE_MINUTES) {
            const hasReminder = activeConv.messages.some((m) => m.content === REMINDER_MESSAGE);
            if (!hasReminder) {
              await prisma.chatMessage.create({
                data: {
                  conversationId: activeConv.id,
                  role: 'ASSISTANT',
                  content: REMINDER_MESSAGE,
                  status: 'SENT',
                },
              });

              activeConv = (await prisma.chatConversation.findUnique({
                where: { id: activeConv.id },
                include: {
                  messages: {
                    orderBy: { createdAt: 'asc' },
                  },
                },
              })) as any;
            }
          }
        }
      }

      const formattedMessages = (activeConv?.messages || []).map((m) => ({
        id: m.id,
        sender: m.role === 'USER' ? 'user' : 'ai',
        text: m.content || '',
        image: m.imageUrl || undefined,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      res.status(200).json({
        success: true,
        data: {
          conversationId: activeConv?.id,
          title: activeConv?.title,
          status: isClosed ? 'CLOSED' : 'ACTIVE',
          isClosed,
          messages: formattedMessages,
        },
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
      if (!req.user?.id) {
        res.status(200).json({
          success: true,
          data: { conversationId: null },
        });
        return;
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.id },
      });

      if (!customer) {
        res.status(200).json({
          success: true,
          data: { conversationId: null },
        });
        return;
      }

      const newConv = await prisma.chatConversation.create({
        data: {
          customerId: customer.id,
          title: 'Cuộc trò chuyện mới',
          status: 'ACTIVE',
        },
      });

      res.status(200).json({
        success: true,
        data: {
          conversationId: newConv.id,
          title: newConv.title,
          status: newConv.status,
          isClosed: false,
        },
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

      const conv = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conv) {
        res.status(404).json({ success: false, message: 'Không tìm thấy cuộc trò chuyện.' });
        return;
      }

      if (conv.status === 'CLOSED') {
        res.status(200).json({ success: true, action: 'ALREADY_CLOSED', isClosed: true });
        return;
      }

      // Kiểm tra tin nhắn cuối cùng: nếu khách hàng đã nhắn tin thì không gửi nhắc/đóng
      const lastMsg = conv.messages[conv.messages.length - 1];
      if (lastMsg && lastMsg.role === 'USER') {
        res.status(200).json({ success: true, action: 'IGNORED_USER_ACTIVE', isClosed: false });
        return;
      }

      if (action === 'REMINDER_3M') {
        const hasReminder = conv.messages.some((m) => m.content === REMINDER_MESSAGE);
        if (hasReminder) {
          res.status(200).json({ success: true, action: 'ALREADY_REMINDED', isClosed: false });
          return;
        }

        const reminderMsg = await prisma.chatMessage.create({
          data: {
            conversationId: conv.id,
            role: 'ASSISTANT',
            content: REMINDER_MESSAGE,
            status: 'SENT',
          },
        });

        await prisma.chatConversation.update({
          where: { id: conv.id },
          data: { updatedAt: new Date() },
        });

        res.status(200).json({
          success: true,
          action: 'REMINDED',
          isClosed: false,
          message: {
            id: reminderMsg.id,
            sender: 'ai',
            text: reminderMsg.content || '',
            timestamp: new Date(reminderMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        });
      } else if (action === 'CLOSE_5M') {
        const closingMsg = await prisma.chatMessage.create({
          data: {
            conversationId: conv.id,
            role: 'ASSISTANT',
            content: CLOSING_MESSAGE,
            status: 'SENT',
          },
        });

        await prisma.chatConversation.update({
          where: { id: conv.id },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        res.status(200).json({
          success: true,
          action: 'CLOSED',
          isClosed: true,
          message: {
            id: closingMsg.id,
            sender: 'ai',
            text: closingMsg.content || '',
            timestamp: new Date(closingMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        });
      } else {
        res.status(400).json({ success: false, message: 'Action không hợp lệ.' });
      }
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

      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      res.status(200).json({ success: true, message: 'Đã đóng cuộc trò chuyện.' });
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi đóng cuộc trò chuyện:', error);
      res.status(500).json({ success: false, message: 'Không thể đóng cuộc trò chuyện.', error: error.message });
    }
  }

  /**
   * Chat hỗ trợ Khách hàng (Hỏi đáp dựa trên tài liệu cẩm nang Markdown + lưu vào CSDL)
   * POST /api/v1/chat/customer
   */
  public async chatCustomer(req: any, res: Response): Promise<void> {
    try {
      const { message, image, conversationId, conversationHistory } = req.body;

      let userQuery = typeof message === 'string' ? message.trim() : '';

      if (!userQuery && (!image || typeof image !== 'string')) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp nội dung tin nhắn hoặc đính kèm hình ảnh.',
        });
        return;
      }

      if (!userQuery && image) {
        userQuery = 'Vui lòng xem hình ảnh kiện hàng đính kèm và kiểm tra, tư vấn quy trình khiếu nại / bồi thường hoặc chính sách liên quan giúp tôi.';
      }

      // 1. Quản lý Conversation trong Database theo khách hàng đăng nhập
      let activeConversationId: string | null = null;
      let customer = null;

      if (req.user?.id) {
        customer = await prisma.customer.findUnique({
          where: { userId: req.user.id },
        });

        if (customer) {
          if (conversationId && typeof conversationId === 'string') {
            const existing = await prisma.chatConversation.findFirst({
              where: { id: conversationId, customerId: customer.id },
            });
            // Nếu phiên cũ đã CLOSED thì không dùng lại mà mở phiên mới
            if (existing && existing.status !== 'CLOSED') {
              activeConversationId = existing.id;
              if (existing.title === 'Cuộc trò chuyện mới') {
                await prisma.chatConversation.update({
                  where: { id: existing.id },
                  data: { title: userQuery.substring(0, 80) },
                });
              }
            }
          }

          if (!activeConversationId) {
            // Lấy cuộc hội thoại ACTIVE gần nhất nếu có
            let conv = await prisma.chatConversation.findFirst({
              where: { customerId: customer.id, status: 'ACTIVE' },
              orderBy: { updatedAt: 'desc' },
            });

            if (!conv) {
              conv = await prisma.chatConversation.create({
                data: {
                  customerId: customer.id,
                  title: userQuery.substring(0, 80),
                  status: 'ACTIVE',
                },
              });
            } else if (conv.title === 'Cuộc trò chuyện mới') {
              await prisma.chatConversation.update({
                where: { id: conv.id },
                data: { title: userQuery.substring(0, 80) },
              });
            }
            activeConversationId = conv.id;
          }

          // Lưu tin nhắn của người dùng vào bảng ChatMessage
          await prisma.chatMessage.create({
            data: {
              conversationId: activeConversationId,
              role: 'USER',
              content: userQuery,
              imageUrl: image || null,
              status: 'SENT',
            },
          });
        }
      }

      // 2. Tìm kiếm ngữ nghĩa trong kho tri thức khách hàng (RAG)
      const searchResults = await ragService.search('CUSTOMER', userQuery, 3);
      const contextText = ragService.formatContextForPrompt(searchResults);

      // 3. Soạn thảo System Prompt dẫn dắt AI trả lời theo tài liệu
      const systemPrompt = `Bạn là Trợ lý ảo CSKH thông minh và chuyên nghiệp của hệ thống logistics Velocity (Smart Logistics).
Hãy trả lời câu hỏi của khách hàng một cách ân cần, lịch sự, ngắn gọn và chính xác tuyệt đối dựa trên các tài liệu chính sách được cung cấp dưới đây.

${contextText ? `=== TÀI LIỆU CHÍNH SÁCH THAM KHẢO ===\n${contextText}\n=== HẾT TÀI LIỆU ===` : 'Hiện chưa có tài liệu cụ thể cho chủ đề này, hãy hướng dẫn khách hàng liên hệ Tổng đài CSKH để được hỗ trợ tốt nhất.'}

Quy tắc trả lời:
- Luôn ưu tiên trả lời dựa theo đúng số liệu, điều khoản và quy trình nêu trong tài liệu tham khảo.
- Nếu người dùng đính kèm hình ảnh (kiện hàng hư hỏng, tem vận đơn, bao bì rách, hàng móp méo...): Hãy quan sát kỹ hình ảnh, nhận xét hiện trạng thấy được và tư vấn quyền lợi/quy trình khiếu nại bồi thường cho khách hàng.
- Nếu tài liệu không đề cập hoặc thông tin vượt quá thẩm quyền, hãy hướng dẫn khách hàng liên hệ Hotline Tổng đài hỗ trợ 1900-6868 hoặc mục Hỗ trợ trên ứng dụng.
- Văn phong: Thân thiện, tôn trọng khách hàng, định dạng rõ ràng (có thể dùng gạch đầu dòng ngắn gọn nếu cần).`;

      // 4. Chuẩn bị lịch sử hội thoại (Ưu tiên lấy trực tiếp từ Database nếu có)
      const messages: any[] = [{ role: 'system', content: systemPrompt }];

      if (activeConversationId) {
        const dbHistory = await prisma.chatMessage.findMany({
          where: { conversationId: activeConversationId },
          orderBy: { createdAt: 'desc' },
          take: 6,
        });
        dbHistory.reverse();

        // Bỏ qua tin nhắn cuối cùng (vì đó chính là tin người dùng vừa gửi, sẽ đưa vào payload riêng dưới đây)
        const previousTurns = dbHistory.slice(0, -1);
        for (const item of previousTurns) {
          if (item.role === 'USER') {
            messages.push({ role: 'user', content: item.content || '' });
          } else if (item.role === 'ASSISTANT') {
            messages.push({ role: 'assistant', content: item.content || '' });
          }
        }
      } else if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-4);
        for (const item of recentHistory) {
          if (item.sender === 'user' || item.role === 'user') {
            messages.push({ role: 'user', content: item.text || item.content });
          } else if (item.sender === 'ai' || item.role === 'assistant') {
            messages.push({ role: 'assistant', content: item.text || item.content });
          }
        }
      }

      // 5. Định dạng tin nhắn người dùng (Hỗ trợ Multimodal Text + Ảnh)
      if (image && typeof image === 'string' && image.startsWith('data:image')) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: userQuery },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        });
      } else {
        messages.push({ role: 'user', content: userQuery });
      }

      // 6. Sinh phản hồi từ Model Nemotron Super VL 120B (Multimodal)
      const response = await nvidiaAIService.createChatCompletion({
        messages,
        temperature: 0.3,
        maxTokens: 1024,
      });

      const choice = response.choices[0]?.message as any;
      const aiReply = choice?.content || choice?.reasoning_content || 'Xin lỗi quý khách, em chưa hiểu rõ yêu cầu. Quý khách vui lòng thử lại hoặc liên hệ tổng đài 1900-6868 ạ.';

      // 7. Lưu câu trả lời của AI vào bảng ChatMessage
      if (activeConversationId) {
        await prisma.chatMessage.create({
          data: {
            conversationId: activeConversationId,
            role: 'ASSISTANT',
            content: aiReply.trim(),
            status: 'SENT',
          },
        });

        await prisma.chatConversation.update({
          where: { id: activeConversationId },
          data: { updatedAt: new Date() },
        });
      }

      // 8. Trích xuất danh sách nguồn tham khảo gửi kèm cho giao diện
      const sources = searchResults.map((r) => ({
        id: r.chunk.id,
        title: r.chunk.title,
        score: Number(r.score.toFixed(2)),
      }));

      res.status(200).json({
        success: true,
        data: {
          reply: aiReply.trim(),
          conversationId: activeConversationId,
          sources,
        },
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
}

export const chatController = new ChatController();
