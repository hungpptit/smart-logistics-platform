import { prisma } from '../../config/prisma';
import {
  assertStaffCanSupportDriver,
  countDriverUnreadMessages,
  formatChatMessageForClient,
  STAFF_SUPPORT_REPLY_TOOL_NAME,
  STAFF_SUPPORT_TOOL_NAME,
  syncDriverChatRealtimeEvents,
} from './driver_support_auth.util';
import { getTrackingGateway } from '../../gateways/tracking.gateway';

export const REMINDER_MESSAGE =
  'Dạ không biết quý khách còn thắc mắc hay cần Velocity hỗ trợ thêm thông tin gì nữa không ạ?';
export const CLOSING_MESSAGE =
  'Do không nhận được phản hồi từ quý khách, Velocity xin phép đóng phiên hỗ trợ này. Cảm ơn quý khách đã tin tưởng và đồng hành cùng Velocity Logistics. Chúc quý khách một ngày tốt lành! Quý khách có thể gửi tin nhắn mới bất cứ lúc nào để bắt đầu phiên hỗ trợ mới.';

export const DRIVER_REMINDER_MESSAGE =
  'Bác tài còn cần hỗ trợ thêm thông tin hoặc xử lý sự cố nào trên chuyến đi nữa không ạ?';
export const DRIVER_CLOSING_MESSAGE =
  'Do không nhận được phản hồi, Trợ lý AI xin phép tạm đóng phiên hỗ trợ này. Chúc bác tài vạn dặm bình an và giao hàng thuận lợi! Bác tài có thể nhắn tin mới bất cứ lúc nào để tiếp tục.';

export class ChatConversationService {
  /**
   * Lấy cuộc hội thoại đang mở (ACTIVE) gần nhất của khách hàng (kèm tự động xử lý timeout)
   */
  public async getActiveConversation(userId?: string) {
    if (!userId) {
      return { conversationId: null, status: 'NEW', isClosed: false, hasUnread: false, messages: [] };
    }

    // Ưu tiên mở phiên gần nhất đang có tin ASSISTANT chưa đọc (kể cả ACTIVE hay CLOSED)
    let activeConv = await prisma.chatConversation.findFirst({
      where: {
        userId,
        messages: {
          some: {
            role: 'ASSISTANT',
            content: { not: null },
            OR: [{ status: null }, { status: { not: 'READ' } }],
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!activeConv) {
      activeConv = await prisma.chatConversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    if (!activeConv) {
      return { conversationId: null, status: 'NEW', isClosed: false, hasUnread: false, messages: [] };
    }

    let isClosed = activeConv.status === 'CLOSED';

    // Xác định vai trò (Tài xế hay Khách hàng) để xưng hô chuẩn xác
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, staff: true },
    });
    const isDriver =
      user?.role?.roleCode === 'SHIPPER' ||
      user?.staff?.position === 'DRIVER' ||
      activeConv.title?.toLowerCase().includes('tài xế');

    const expectedReminder = isDriver ? DRIVER_REMINDER_MESSAGE : REMINDER_MESSAGE;
    const expectedClosing = isDriver ? DRIVER_CLOSING_MESSAGE : CLOSING_MESSAGE;

    // Xử lý Timeout tự động trên Server (Shopee Style: 3p nhắc nhở, 5p tự đóng)
    // Bỏ qua nếu tin cuối là STAFF_SUPPORT để không tự đóng phiên hỗ trợ từ Nhân viên Kho
    if (!isClosed && activeConv.messages.length > 0) {
      const lastMsg = activeConv.messages[activeConv.messages.length - 1];
      if (lastMsg.role === 'ASSISTANT' && lastMsg.toolName !== STAFF_SUPPORT_TOOL_NAME) {
        const elapsedMs = Date.now() - new Date(lastMsg.createdAt).getTime();
        const THREE_MINUTES = 3 * 60 * 1000;
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (elapsedMs >= FIVE_MINUTES) {
          const hasReminder = activeConv.messages.some(
            (m) =>
              m.content === expectedReminder ||
              m.content === REMINDER_MESSAGE ||
              m.content === DRIVER_REMINDER_MESSAGE
          );
          if (!hasReminder) {
            await prisma.chatMessage.create({
              data: {
                conversationId: activeConv.id,
                role: 'ASSISTANT',
                content: expectedReminder,
                status: 'SENT',
                createdAt: new Date(new Date(lastMsg.createdAt).getTime() + THREE_MINUTES),
              },
            });
          }

          const hasClosing = activeConv.messages.some(
            (m) =>
              m.content === expectedClosing ||
              m.content === CLOSING_MESSAGE ||
              m.content === DRIVER_CLOSING_MESSAGE
          );
          if (!hasClosing) {
            await prisma.chatMessage.create({
              data: {
                conversationId: activeConv.id,
                role: 'ASSISTANT',
                content: expectedClosing,
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
          const hasReminder = activeConv.messages.some(
            (m) =>
              m.content === expectedReminder ||
              m.content === REMINDER_MESSAGE ||
              m.content === DRIVER_REMINDER_MESSAGE
          );
          if (!hasReminder) {
            await prisma.chatMessage.create({
              data: {
                conversationId: activeConv.id,
                role: 'ASSISTANT',
                content: expectedReminder,
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

    const assistantVisibleMessages = (activeConv?.messages || []).filter(
      (m) => m.role === 'USER' || (m.role === 'ASSISTANT' && m.content)
    );

    const hasUnread = assistantVisibleMessages.some(
      (m) => m.role === 'ASSISTANT' && m.status !== 'READ'
    );

    const formattedMessages = assistantVisibleMessages.map((m) => ({
      id: m.id,
      sender: m.role === 'USER' ? 'user' : 'ai',
      role: m.role,
      text: m.content || '',
      content: m.content || '',
      image: m.imageUrl || undefined,
      actionData: (m.toolResult as any) || undefined,
      status: m.status || 'SENT',
      toolName: m.toolName || undefined,
      senderName:
        m.toolResult && typeof m.toolResult === 'object' && (m.toolResult as any).senderName
          ? String((m.toolResult as any).senderName)
          : undefined,
      timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: m.createdAt,
    }));

    return {
      conversationId: activeConv?.id,
      title: activeConv?.title,
      status: isClosed ? 'CLOSED' : 'ACTIVE',
      isClosed,
      hasUnread,
      messages: formattedMessages,
    };
  }

  /**
   * Tạo một cuộc trò chuyện mới
   */
  public async createNewConversation(userId?: string) {
    if (!userId) {
      return { conversationId: null };
    }

    const newConv = await prisma.chatConversation.create({
      data: {
        userId,
        title: 'Cuộc trò chuyện mới',
        status: 'ACTIVE',
      },
    });

    return {
      conversationId: newConv.id,
      title: newConv.title,
      status: newConv.status,
      isClosed: false,
    };
  }

  /**
   * Lấy hoặc tự động tạo phiên trò chuyện hợp lệ cho lượt chat mới
   */
  public async getOrCreateActiveConversation(
    userId: string,
    requestedConvId?: string,
    firstQueryText?: string
  ): Promise<string> {
    const titleSnippet = firstQueryText ? firstQueryText.substring(0, 80) : 'Cuộc trò chuyện mới';

    if (requestedConvId) {
      const existing = await prisma.chatConversation.findFirst({
        where: { id: requestedConvId, userId },
      });
      if (existing && existing.status !== 'CLOSED') {
        if (existing.title === 'Cuộc trò chuyện mới' && firstQueryText) {
          await prisma.chatConversation.update({
            where: { id: existing.id },
            data: { title: titleSnippet },
          });
        }
        return existing.id;
      }
    }

    // Tìm phiên gần nhất đang ACTIVE
    let conv = await prisma.chatConversation.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conv) {
      conv = await prisma.chatConversation.create({
        data: {
          userId,
          title: titleSnippet,
          status: 'ACTIVE',
        },
      });
    } else if (conv.title === 'Cuộc trò chuyện mới' && firstQueryText) {
      await prisma.chatConversation.update({
        where: { id: conv.id },
        data: { title: titleSnippet },
      });
    }

    return conv.id;
  }

  /**
   * Xử lý sự kiện Timeout Check (Shopee CSKH Style: 3p nhắc nhở, 5p tự đóng)
   */
  public async handleTimeoutCheck(conversationId: string, action: 'REMINDER_3M' | 'CLOSE_5M') {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          include: {
            role: true,
            staff: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conv) {
      return { success: false, status: 404, message: 'Không tìm thấy cuộc trò chuyện.' };
    }

    if (conv.status === 'CLOSED') {
      return { success: true, action: 'ALREADY_CLOSED', isClosed: true };
    }

    // Nếu người dùng vừa nhắn tin hoặc tin cuối là Nhân viên Kho hỗ trợ thì không gửi nhắc/đóng AI
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (lastMsg && (lastMsg.role === 'USER' || lastMsg.toolName === STAFF_SUPPORT_TOOL_NAME)) {
      return { success: true, action: 'IGNORED_USER_ACTIVE', isClosed: false };
    }

    const isDriver =
      conv.user?.role?.roleCode === 'SHIPPER' ||
      conv.user?.staff?.position === 'DRIVER' ||
      conv.title?.toLowerCase().includes('tài xế');

    const expectedReminder = isDriver ? DRIVER_REMINDER_MESSAGE : REMINDER_MESSAGE;
    const expectedClosing = isDriver ? DRIVER_CLOSING_MESSAGE : CLOSING_MESSAGE;

    // 1. Tìm tin nhắn trợ lý AI thật gần nhất (bỏ qua tin nhắc nhở và tin STAFF_SUPPORT)
    const assistantMessages = conv.messages.filter(
      (m) =>
        m.role === 'ASSISTANT' &&
        m.toolName !== STAFF_SUPPORT_TOOL_NAME &&
        m.content !== REMINDER_MESSAGE &&
        m.content !== CLOSING_MESSAGE &&
        m.content !== DRIVER_REMINDER_MESSAGE &&
        m.content !== DRIVER_CLOSING_MESSAGE
    );
    const lastRealAssistantMsg =
      assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

    if (!lastRealAssistantMsg) {
      return { success: true, action: 'NOOP', isClosed: false, message: 'Chưa có câu trả lời từ Trợ lý AI.' };
    }

    const lastAiTime = new Date(lastRealAssistantMsg.createdAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastAiTime) / 1000);

    // Ngưỡng thời gian (hỗ trợ override qua process.env khi test nhanh)
    const REMINDER_THRESHOLD_SECONDS = process.env.TEST_TIMEOUT_REMIND_SEC
      ? parseInt(process.env.TEST_TIMEOUT_REMIND_SEC, 10)
      : 180; // 3 phút = 180 giây
    const CLOSE_THRESHOLD_SECONDS = process.env.TEST_TIMEOUT_CLOSE_SEC
      ? parseInt(process.env.TEST_TIMEOUT_CLOSE_SEC, 10)
      : 300; // 5 phút = 300 giây

    if (action === 'REMINDER_3M') {
      const hasReminder = conv.messages.some(
        (m) =>
          m.content === expectedReminder ||
          m.content === REMINDER_MESSAGE ||
          m.content === DRIVER_REMINDER_MESSAGE
      );
      if (hasReminder) {
        // Chống lặp: Chỉ gửi nhắc nhở đúng 1 lần duy nhất trong phiên
        return { success: true, action: 'NOOP', isClosed: false, message: 'Đã gửi lời nhắc trước đó rồi.' };
      }

      if (elapsedSeconds < REMINDER_THRESHOLD_SECONDS) {
        return {
          success: true,
          action: 'NOOP',
          isClosed: false,
          message: `Chưa đủ thời gian nhắc nhở 3 phút (mới trôi qua ${elapsedSeconds}s).`,
        };
      }

      const isInChatScreen = isDriver && conv.userId
        ? Boolean(getTrackingGateway()?.isUserInChatScreen(conv.userId))
        : false;

      const reminderMsg = await prisma.chatMessage.create({
        data: {
          conversationId: conv.id,
          role: 'ASSISTANT',
          content: expectedReminder,
          status: isInChatScreen ? 'READ' : 'SENT',
        },
      });

      await prisma.chatConversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      });

      if (isDriver && conv.userId) {
        await syncDriverChatRealtimeEvents({
          driverUserId: conv.userId,
          message: reminderMsg,
          emitUnreadToDriver: !isInChatScreen,
          emitNewMessageToDriver: true,
        });
      }

      return {
        success: true,
        action: 'REMINDED',
        isClosed: false,
        message: {
          id: reminderMsg.id,
          sender: 'ai',
          text: reminderMsg.content || '',
          timestamp: new Date(reminderMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      };
    }

    if (action === 'CLOSE_5M') {
      if (elapsedSeconds < CLOSE_THRESHOLD_SECONDS) {
        return {
          success: true,
          action: 'NOOP',
          isClosed: false,
          message: `Chưa đủ thời gian tự đóng phiên 5 phút (mới trôi qua ${elapsedSeconds}s).`,
        };
      }

      const isInChatScreen = isDriver && conv.userId
        ? Boolean(getTrackingGateway()?.isUserInChatScreen(conv.userId))
        : false;

      const closingMsg = await prisma.chatMessage.create({
        data: {
          conversationId: conv.id,
          role: 'ASSISTANT',
          content: expectedClosing,
          status: isInChatScreen ? 'READ' : 'SENT',
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

      if (isDriver && conv.userId) {
        await syncDriverChatRealtimeEvents({
          driverUserId: conv.userId,
          message: closingMsg,
          emitUnreadToDriver: !isInChatScreen,
          emitNewMessageToDriver: true,
        });
      }

      return {
        success: true,
        action: 'CLOSED',
        isClosed: true,
        message: {
          id: closingMsg.id,
          sender: 'ai',
          text: closingMsg.content || '',
          timestamp: new Date(closingMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      };
    }

    return { success: false, status: 400, message: 'Action không hợp lệ.' };
  }

  /**
   * Đóng thủ công cuộc trò chuyện
   */
  public async closeConversation(conversationId: string) {
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return { success: true, message: 'Đã đóng cuộc trò chuyện.' };
  }

  /**
   * Đếm số tin nhắn ASSISTANT chưa đọc của tài xế
   */
  public async getDriverUnreadCount(userId: string): Promise<number> {
    return countDriverUnreadMessages(userId);
  }

  /**
   * Đánh dấu các tin nhắn ASSISTANT chưa đọc của tài xế sang READ và đồng bộ badge realtime về 0
   */
  public async markDriverMessagesAsRead(userId: string, conversationId?: string): Promise<number> {
    if (!userId) return 0;

    await prisma.chatMessage.updateMany({
      where: {
        conversation: conversationId
          ? { id: conversationId, userId }
          : { userId },
        role: 'ASSISTANT',
        OR: [{ status: null }, { status: { not: 'READ' } }],
      },
      data: { status: 'READ' },
    });

    const remainingUnread = await countDriverUnreadMessages(userId);
    getTrackingGateway()?.emitDriverUnreadUpdated(userId, remainingUnread);
    return remainingUnread;
  }

  /**
   * Tài xế trả lời trực tiếp cho Nhân viên Kho / Điều phối (lưu DB + đẩy Socket, không gọi AI LLM)
   */
  public async replyToStaffByDriver(params: {
    driverUserId: string;
    message?: string;
    image?: string;
    conversationId?: string;
  }) {
    const cleanText = params.message?.trim() || '';
    const activeConvId = await this.getOrCreateActiveConversation(
      params.driverUserId,
      params.conversationId,
      cleanText || 'Phản hồi Nhân viên Điều phối'
    );

    const savedMsg = await prisma.chatMessage.create({
      data: {
        conversationId: activeConvId,
        role: 'USER',
        content: cleanText,
        imageUrl: params.image || null,
        toolName: STAFF_SUPPORT_REPLY_TOOL_NAME,
        status: 'SENT',
      },
    });

    await prisma.chatConversation.update({
      where: { id: activeConvId },
      data: { updatedAt: new Date() },
    });

    await syncDriverChatRealtimeEvents({
      driverUserId: params.driverUserId,
      message: savedMsg,
      emitUnreadToDriver: false,
      emitNewMessageToDriver: false,
    });

    return formatChatMessageForClient(savedMsg);
  }

  /**
   * Lấy lịch sử tin nhắn gần nhất theo userId của tài xế cho Nhân viên Kho / Admin trên Web
   */
  public async getDriverConversationForStaff(params: {
    staffUserId: string;
    staffRoles: string[];
    driverUserId: string;
  }) {
    const driverInfo = await assertStaffCanSupportDriver(
      params.staffUserId,
      params.staffRoles,
      params.driverUserId
    );

    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        conversation: { userId: params.driverUserId },
        OR: [{ role: 'USER' }, { role: 'ASSISTANT', content: { not: null } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    const formatted = recentMessages.reverse().map((m) => formatChatMessageForClient(m));
    const latestConversationId =
      formatted.length > 0 ? formatted[formatted.length - 1].conversationId : null;

    return {
      driverUserId: params.driverUserId,
      driverName: driverInfo.driverFullName,
      conversationId: latestConversationId,
      messages: formatted,
    };
  }

  /**
   * Nhân viên Kho / Admin gửi tin nhắn hỗ trợ 2 chiều xuống Tài xế
   */
  public async sendMessageFromStaffToDriver(params: {
    staffUserId: string;
    staffUsername?: string;
    staffRoles: string[];
    driverUserId: string;
    message: string;
  }) {
    const driverInfo = await assertStaffCanSupportDriver(
      params.staffUserId,
      params.staffRoles,
      params.driverUserId
    );

    const senderName =
      driverInfo.staffFullName || params.staffUsername || 'Nhân viên Điều phối';
    const senderRole = params.staffRoles.includes('ADMIN') ? 'ADMIN' : 'STAFF';

    const activeConvId = await this.getOrCreateActiveConversation(
      params.driverUserId,
      undefined,
      `Hỗ trợ từ ${senderName}`
    );

    const isDriverInChat = Boolean(
      getTrackingGateway()?.isUserInChatScreen(params.driverUserId)
    );

    const savedMsg = await prisma.chatMessage.create({
      data: {
        conversationId: activeConvId,
        role: 'ASSISTANT',
        content: params.message.trim(),
        toolName: STAFF_SUPPORT_TOOL_NAME,
        toolResult: {
          senderRole,
          senderName,
          staffUserId: params.staffUserId,
        },
        status: isDriverInChat ? 'READ' : 'SENT',
      },
    });

    await prisma.chatConversation.update({
      where: { id: activeConvId },
      data: { updatedAt: new Date() },
    });

    const unreadCount = await syncDriverChatRealtimeEvents({
      driverUserId: params.driverUserId,
      message: savedMsg,
      emitUnreadToDriver: !isDriverInChat,
      emitNewMessageToDriver: true,
    });

    return {
      message: formatChatMessageForClient(savedMsg),
      unreadCount,
    };
  }
}

export const chatConversationService = new ChatConversationService();

