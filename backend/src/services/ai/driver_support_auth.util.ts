import { prisma } from '../../config/prisma';
import { ForbiddenException, NotFoundException } from '../../middlewares/error.middleware';
import { getTrackingGateway } from '../../gateways/tracking.gateway';

export const STAFF_SUPPORT_TOOL_NAME = 'STAFF_SUPPORT';
export const STAFF_SUPPORT_REPLY_TOOL_NAME = 'STAFF_SUPPORT_REPLY';

export interface StaffAccessProfile {
  fullName?: string | null;
  assignedFacilityId?: string | null;
}

export interface DriverAccessProfile {
  id: string;
  fullName?: string | null;
  assignedFacilityId?: string | null;
  isShipper?: boolean;
}

export interface ChatTurnHistoryItem {
  role: 'USER' | 'ASSISTANT' | 'TOOL' | string;
  content: string | null;
  toolName?: string | null;
  toolResult?: any;
}

export interface LlmChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Kiểm tra quyền của ADMIN hoặc STAFF khi truy cập / nhắn hỗ trợ một tài xế.
 * - ADMIN: được phép hỗ trợ mọi tài xế.
 * - STAFF: bắt buộc phải có `assignedFacilityId` và phải trùng khớp với `assignedFacilityId` của tài xế.
 */
export function evaluateStaffDriverAccess(params: {
  staffRoles: string[];
  staffProfile: StaffAccessProfile | null;
  driverProfile: DriverAccessProfile | null;
}): { driverFacilityId: string | null; staffFullName: string | null } {
  const { staffRoles, staffProfile, driverProfile } = params;
  const isAdmin = staffRoles.includes('ADMIN');
  const isStaff = staffRoles.includes('STAFF');

  if (!isAdmin && !isStaff) {
    throw new ForbiddenException('Bạn không có quyền sử dụng kênh hỗ trợ tài xế.');
  }

  if (!driverProfile || driverProfile.isShipper === false) {
    throw new NotFoundException('Không tìm thấy hồ sơ tài xế tương ứng.');
  }

  if (isAdmin) {
    return {
      driverFacilityId: driverProfile.assignedFacilityId ?? null,
      staffFullName: staffProfile?.fullName ?? null,
    };
  }

  if (!staffProfile?.assignedFacilityId) {
    throw new ForbiddenException(
      'Tài khoản nhân viên chưa được gán kho hoạt động nên không thể hỗ trợ tài xế.'
    );
  }

  if (
    !driverProfile.assignedFacilityId ||
    staffProfile.assignedFacilityId !== driverProfile.assignedFacilityId
  ) {
    throw new ForbiddenException(
      'Bạn chỉ được phép xem và nhắn hỗ trợ cho tài xế thuộc kho/bưu cục của mình.'
    );
  }

  return {
    driverFacilityId: driverProfile.assignedFacilityId,
    staffFullName: staffProfile.fullName ?? null,
  };
}

/**
 * Truy vấn CSDL và xác thực quyền Nhân viên Kho / Admin hỗ trợ Tài xế.
 */
export async function assertStaffCanSupportDriver(
  staffUserId: string,
  staffRoles: string[],
  driverUserId: string
): Promise<{
  driverStaffId: string;
  driverFullName: string;
  driverFacilityId: string | null;
  staffFullName: string | null;
}> {
  if (!staffUserId) {
    throw new ForbiddenException('Không xác định được tài khoản nhân viên.');
  }

  const [driverStaff, staffProfile] = await Promise.all([
    prisma.staff.findUnique({
      where: { userId: driverUserId },
      select: {
        id: true,
        fullName: true,
        assignedFacilityId: true,
        user: {
          select: {
            role: {
              select: { roleCode: true },
            },
          },
        },
      },
    }),
    prisma.staff.findUnique({
      where: { userId: staffUserId },
      select: {
        fullName: true,
        assignedFacilityId: true,
      },
    }),
  ]);

  const access = evaluateStaffDriverAccess({
    staffRoles,
    staffProfile,
    driverProfile: driverStaff
      ? {
          id: driverStaff.id,
          fullName: driverStaff.fullName,
          assignedFacilityId: driverStaff.assignedFacilityId,
          isShipper: driverStaff.user?.role?.roleCode === 'SHIPPER',
        }
      : null,
  });

  return {
    driverStaffId: driverStaff!.id,
    driverFullName: driverStaff!.fullName || 'Tài xế',
    driverFacilityId: access.driverFacilityId,
    staffFullName: access.staffFullName,
  };
}

/**
 * Chuyển đổi lịch sử hội thoại DB sang định dạng messages cho LLM.
 * Tin nhắn STAFF_SUPPORT không được đưa vào với role 'assistant' để tránh AI hiểu nhầm là lời AI tự nói,
 * mà được chuyển thành system context rõ ràng.
 */
export function mapDbHistoryToLlmMessages(
  previousTurns: ChatTurnHistoryItem[]
): LlmChatHistoryMessage[] {
  const result: LlmChatHistoryMessage[] = [];

  for (const item of previousTurns) {
    if (item.role === 'USER') {
      result.push({ role: 'user', content: item.content || '' });
    } else if (item.role === 'ASSISTANT' && item.content) {
      if (item.toolName === STAFF_SUPPORT_TOOL_NAME) {
        const senderName =
          item.toolResult && typeof item.toolResult === 'object' && item.toolResult.senderName
            ? String(item.toolResult.senderName)
            : 'Nhân viên Kho / Điều phối';
        result.push({
          role: 'system',
          content: `[Ngữ cảnh hỗ trợ nội bộ - Tin nhắn từ ${senderName} gửi cho tài xế: "${item.content}"]`,
        });
      } else {
        result.push({ role: 'assistant', content: item.content });
      }
    }
  }

  return result;
}

/**
 * Đếm số tin nhắn chưa đọc từ hệ thống / AI / Nhân viên Kho gửi tới Tài xế.
 */
export async function countDriverUnreadMessages(userId: string): Promise<number> {
  if (!userId) return 0;
  return prisma.chatMessage.count({
    where: {
      conversation: { userId },
      role: 'ASSISTANT',
      content: { not: null },
      OR: [{ status: null }, { status: { not: 'READ' } }],
    },
  });
}

export interface ClientChatMessageRecord {
  id: string;
  conversationId: string;
  role: string;
  content: string | null;
  status?: string | null;
  imageUrl?: string | null;
  toolName?: string | null;
  toolResult?: any;
  createdAt: Date | string;
}

/**
 * Chuẩn hóa payload tin nhắn gửi qua Socket cho Mobile & Web.
 */
export function formatChatMessageForClient(msg: ClientChatMessageRecord) {
  const createdAtDate = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
  const hours = String(createdAtDate.getHours()).padStart(2, '0');
  const minutes = String(createdAtDate.getMinutes()).padStart(2, '0');
  const senderName =
    msg.toolResult && typeof msg.toolResult === 'object' && msg.toolResult.senderName
      ? String(msg.toolResult.senderName)
      : undefined;

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role,
    text: msg.content || '',
    isUser: msg.role === 'USER',
    time: `${hours}:${minutes}`,
    status: msg.status || 'SENT',
    imageUrl: msg.imageUrl || undefined,
    toolName: msg.toolName || undefined,
    senderName,
    createdAt: createdAtDate.toISOString(),
  };
}

/**
 * Phát sự kiện realtime khi có tin nhắn mới cho tài xế hoặc nhân viên hỗ trợ trên Web.
 */
export async function syncDriverChatRealtimeEvents(params: {
  driverUserId: string;
  message: ClientChatMessageRecord;
  emitUnreadToDriver: boolean;
  emitNewMessageToDriver?: boolean;
}): Promise<number | null> {
  const gateway = getTrackingGateway();
  if (!gateway) return null;

  const clientMsg = formatChatMessageForClient(params.message);

  // Luôn đồng bộ realtime lên modal Điều phối / Kho trên Web
  gateway.emitStaffDriverMessage(params.driverUserId, clientMsg);

  if (params.emitNewMessageToDriver) {
    gateway.emitDriverNewMessage(params.driverUserId, clientMsg);
  }

  if (params.emitUnreadToDriver) {
    const unreadCount = await countDriverUnreadMessages(params.driverUserId);
    gateway.emitDriverUnreadUpdated(params.driverUserId, unreadCount);
    return unreadCount;
  }

  return null;
}

