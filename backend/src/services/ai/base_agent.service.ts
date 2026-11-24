import { prisma } from '../../config/prisma';
import { ragService } from './rag.service';
import { nvidiaAIService, ChatTool } from './nvidia.service';
import { toolRegistry } from './tool_registry';
import { ToolContext } from './tools/customer_read.tools';
import { chatConversationService } from './chat_conversation.service';
import { securityAuditService } from './security_audit.service';

export interface ProcessChatParams {
  userId?: string;
  message?: string;
  image?: string;
  conversationId?: string;
  conversationHistory?: any[];
}

export interface ProcessChatResult {
  reply: string;
  conversationId: string | null;
  sources: Array<{ id: string; title: string; score: number }>;
  toolsUsed: string[];
  actionData?: any;
}

export interface BaseAgentConfig {
  roleName: string;
  ragRole: 'CUSTOMER' | 'SHIPPER';
  tools?: ChatTool[];
  buildSystemPrompt: (ragContext: string) => string;
  defaultFallbackReply?: string;
}

export class BaseAgentService {
  /**
   * Bộ điều phối chung cho hội thoại AI đa vai trò (RAG + Vision + Tool Calling Loop)
   * Nhận ToolContext đã được xác thực và dựng sẵn từ Agent chuyên trách, không phụ thuộc bảng hồ sơ cụ thể.
   */
  public async processMessage(
    params: ProcessChatParams,
    config: BaseAgentConfig,
    toolContext: ToolContext
  ): Promise<ProcessChatResult> {
    const { userId, message, image, conversationId, conversationHistory } = params;

    let userQuery = typeof message === 'string' ? message.trim() : '';

    if (!userQuery && image) {
      userQuery =
        config.ragRole === 'SHIPPER'
          ? 'Vui lòng xem hình ảnh sự cố/biên bản đính kèm và hướng dẫn xử lý nghiệp vụ giúp tôi.'
          : 'Vui lòng xem hình ảnh kiện hàng đính kèm và kiểm tra, tư vấn quy trình khiếu nại / bồi thường hoặc chính sách liên quan giúp tôi.';
    }

    // 1. Quản lý Conversation & Lưu tin nhắn USER
    let activeConversationId: string | null = null;

    if (userId) {
      activeConversationId = await chatConversationService.getOrCreateActiveConversation(
        userId,
        conversationId,
        userQuery
      );

      // Lưu tin nhắn USER vào CSDL
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

    // 2. Tìm kiếm ngữ nghĩa trong kho tri thức theo vai trò (RAG)
    const searchResults = await ragService.search(config.ragRole, userQuery, 3);
    const contextText = ragService.formatContextForPrompt(searchResults);

    // 3. Xây dựng System Prompt từ config
    const systemPrompt = config.buildSystemPrompt(contextText);

    // 4. Chuẩn bị lịch sử hội thoại
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    if (activeConversationId) {
      const dbHistory = await prisma.chatMessage.findMany({
        where: { conversationId: activeConversationId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      dbHistory.reverse();

      // Bỏ qua tin nhắn cuối cùng (chính là tin vừa tạo ở trên)
      const previousTurns = dbHistory.slice(0, -1);
      for (const item of previousTurns) {
        if (item.role === 'USER') {
          messages.push({ role: 'user', content: item.content || '' });
        } else if (item.role === 'ASSISTANT' && item.content) {
          messages.push({ role: 'assistant', content: item.content });
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

    // 5. Thêm tin nhắn người dùng hiện tại (Multimodal Text + Image nếu có)
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

    // 6. Gọi Model LLM (Lưu ý: Bỏ thuộc tính tools nếu danh sách rỗng để tránh lỗi API)
    const chatPayload: any = {
      messages,
      temperature: 0.3,
      maxTokens: 1024,
    };
    if (config.tools && config.tools.length > 0) {
      chatPayload.tools = config.tools;
    }

    let response = await nvidiaAIService.createChatCompletion(chatPayload);

    let choice = response.choices[0]?.message as any;
    let iterations = 0;
    const MAX_TOOL_ITERATIONS = 3;
    const toolsUsed: string[] = [];
    let latestActionData: any = null;

    // 7. Vòng lặp Agentic Tool Calling Loop (chỉ chạy khi model yêu cầu gọi tool)
    while (choice?.tool_calls && choice.tool_calls.length > 0 && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      console.log(`[BaseAgent] ${config.roleName} LLM yêu cầu gọi ${choice.tool_calls.length} tool(s) (Lượt ${iterations})`);

      messages.push(choice);

      for (const toolCall of choice.tool_calls) {
        const toolName = toolCall.function?.name;
        toolsUsed.push(toolName);
        let toolArgs: Record<string, any> = {};
        try {
          toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch (e) {
          toolArgs = {};
        }

        // Lưu lượt gọi tool của AI vào DB
        if (activeConversationId) {
          await prisma.chatMessage.create({
            data: {
              conversationId: activeConversationId,
              role: 'ASSISTANT',
              content: choice.content || null,
              toolCallId: toolCall.id,
              toolName,
              toolArgs,
              status: 'SENT',
            },
          });
        }

        let toolResult: any;
        const startTime = Date.now();

        // 1. Kiểm tra Rate Limit gọi Tool theo User (15 calls / phút)
        const toolRate = securityAuditService.checkToolRateLimit(toolContext.userId);
        if (!toolRate.allowed) {
          toolResult = {
            success: false,
            message: `Bạn đang gọi công cụ tra cứu quá nhanh. Vui lòng thử lại sau ${toolRate.retryAfterSec || 10} giây.`,
          };
        }

        // 2. Kiểm tra Hạn mức gọi Tool theo Phiên (max 20 calls / conversation)
        if (!toolResult) {
          const sessionQuota = securityAuditService.checkSessionToolQuota(activeConversationId || undefined);
          if (!sessionQuota.allowed) {
            toolResult = {
              success: false,
              message: 'Đã đạt hạn mức tra cứu tối đa (20 lượt) cho phiên này. Bác tài vui lòng tiếp tục lộ trình giao hàng hoặc tạo phiên mới.',
            };
          }
        }

        // 3. Kiểm tra Phân quyền Tool theo Vai trò tại Runtime (Runtime Tool Authorization)
        if (!toolResult) {
          const allowedTools = toolRegistry.getToolsForRole((toolContext.role as any) || 'CUSTOMER');
          const isAllowed = allowedTools.some((t) => t.function.name === toolName);
          if (!isAllowed) {
            console.warn(`[Security] Chặn thực thi tool "${toolName}" không được cấp phép cho vai trò "${toolContext.role}".`);
            toolResult = {
              success: false,
              message: `Công cụ "${toolName}" không được cấp phép cho vai trò ${toolContext.role || 'hiện tại'}.`,
            };
          }
        }

        // 4. Thực thi Tool qua Registry nếu mọi kiểm tra hợp lệ
        if (!toolResult) {
          toolResult = await toolRegistry.execute(toolName, toolArgs, toolContext);
        }

        const durationMs = Date.now() - startTime;

        // 5. Ghi nhật ký Audit Log bảo mật
        securityAuditService.logToolExecution({
          userId: toolContext.userId,
          staffId: toolContext.staffId,
          role: toolContext.role,
          toolName,
          params: toolArgs,
          status: toolResult.success ? 'SUCCESS' : 'FAILED',
          durationMs,
          message: toolResult.message,
        });

        // Bắt giữ dữ liệu hành động nếu có
        if (
          toolResult &&
          (toolResult.requiresConfirmation || toolResult.isDraft || toolResult.isEscalation)
        ) {
          latestActionData = toolResult;
        } else if (
          toolResult &&
          toolName === 'get_customer_orders' &&
          Array.isArray(toolResult.orders) &&
          toolResult.orders.length > 0
        ) {
          latestActionData = {
            isOrderList: true,
            orders: toolResult.orders,
          };
        }

        // 6. Che dữ liệu nhạy cảm (SĐT, địa chỉ) trước khi lưu vào CSDL
        const maskedResult = securityAuditService.maskToolResultForStorage(toolResult);

        // Lưu kết quả Tool vào DB
        if (activeConversationId) {
          await prisma.chatMessage.create({
            data: {
              conversationId: activeConversationId,
              role: 'TOOL',
              content: JSON.stringify(maskedResult),
              toolCallId: toolCall.id,
              toolName,
              toolResult: maskedResult,
              status: toolResult.success ? 'OK' : 'ERROR',
            },
          });
        }

        // Đưa kết quả Tool (nguyên bản để LLM xử lý đúng ngữ cảnh) vào messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Gọi lại AI sau khi có kết quả Tool
      const nextPayload: any = {
        messages,
        temperature: 0.3,
        maxTokens: 1024,
      };
      if (config.tools && config.tools.length > 0) {
        nextPayload.tools = config.tools;
      }

      response = await nvidiaAIService.createChatCompletion(nextPayload);
      choice = response.choices[0]?.message as any;
    }

    const defaultReply =
      config.defaultFallbackReply ||
      'Dạ em đã tra cứu thông tin cho quý khách, quý khách có cần hỗ trợ gì thêm không ạ?';

    const aiReply = choice?.content || choice?.reasoning_content || defaultReply;

    // 8. Lưu câu trả lời cuối cùng vào DB (kèm dữ liệu thẻ hành động nếu có)
    if (activeConversationId) {
      await prisma.chatMessage.create({
        data: {
          conversationId: activeConversationId,
          role: 'ASSISTANT',
          content: aiReply.trim(),
          toolResult: latestActionData || undefined,
          status: 'SENT',
        },
      });

      await prisma.chatConversation.update({
        where: { id: activeConversationId },
        data: { updatedAt: new Date() },
      });
    }

    // 9. Trích xuất sources
    const sources = searchResults.map((r) => ({
      id: r.chunk.id,
      title: r.chunk.title,
      score: Number(r.score.toFixed(2)),
    }));

    return {
      reply: aiReply.trim(),
      conversationId: activeConversationId,
      sources,
      toolsUsed: Array.from(new Set(toolsUsed)),
      actionData: latestActionData || null,
    };
  }
}

export const baseAgentService = new BaseAgentService();
