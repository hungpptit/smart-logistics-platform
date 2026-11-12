import { prisma } from '../../config/prisma';

export const REMINDER_MESSAGE =
  'Dạ không biết quý khách còn thắc mắc hay cần Velocity hỗ trợ thêm thông tin gì nữa không ạ?';
export const CLOSING_MESSAGE =
  'Do không nhận được phản hồi từ quý khách, Velocity xin phép đóng phiên hỗ trợ này. Cảm ơn quý khách đã tin tưởng và đồng hành cùng Velocity Logistics. Chúc quý khách một ngày tốt lành! Quý khách có thể gửi tin nhắn mới bất cứ lúc nào để bắt đầu phiên hỗ trợ mới.';

export class ChatConversationService {
  /**
   * Lấy cuộc hội thoại đang mở (ACTIVE) gần nhất của khách hàng (kèm tự động xử lý timeout)
   */
  public async getActiveConversation(userId?: string) {
    if (!userId) {
      return { conversationId: null, status: 'NEW', isClosed: false, messages: [] };
    }

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return { conversationId: null, status: 'NEW', isClosed: false, messages: [] };
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
      return { conversationId: null, status: 'NEW', isClosed: false, messages: [] };
    }

    let isClosed = activeConv.status === 'CLOSED';

    // Xử lý Timeout tự động trên Server (Shopee Style: 3p nhắc nhở, 5p tự đóng)
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

    const formattedMessages = (activeConv?.messages || [])
      .filter((m) => m.role === 'USER' || (m.role === 'ASSISTANT' && m.content))
      .map((m) => ({
        id: m.id,
        sender: m.role === 'USER' ? 'user' : 'ai',
        text: m.content || '',
        image: m.imageUrl || undefined,
        actionData: (m.toolResult as any) || undefined,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

    return {
      conversationId: activeConv?.id,
      title: activeConv?.title,
      status: isClosed ? 'CLOSED' : 'ACTIVE',
      isClosed,
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

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return { conversationId: null };
    }

    const newConv = await prisma.chatConversation.create({
      data: {
        customerId: customer.id,
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
    customerId: string,
    requestedConvId?: string,
    firstQueryText?: string
  ): Promise<string> {
    const titleSnippet = firstQueryText ? firstQueryText.substring(0, 80) : 'Cuộc trò chuyện mới';

    if (requestedConvId) {
      const existing = await prisma.chatConversation.findFirst({
        where: { id: requestedConvId, customerId },
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
      where: { customerId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conv) {
      conv = await prisma.chatConversation.create({
        data: {
          customerId,
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

    // Nếu người dùng vừa nhắn tin thì không gửi nhắc/đóng
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (lastMsg && lastMsg.role === 'USER') {
      return { success: true, action: 'IGNORED_USER_ACTIVE', isClosed: false };
    }

    if (action === 'REMINDER_3M') {
      const hasReminder = conv.messages.some((m) => m.content === REMINDER_MESSAGE);
      if (hasReminder) {
        return { success: true, action: 'ALREADY_REMINDED', isClosed: false };
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
}

export const chatConversationService = new ChatConversationService();

