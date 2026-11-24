/**
 * Dịch vụ Giám sát Bảo mật, Ghi vết Audit Log và Kiểm soát Tần suất cho Trợ lý AI
 */

interface SecurityLogEntry {
  userId?: string;
  staffId?: string;
  role?: string;
  toolName: string;
  params: Record<string, any>;
  status: 'SUCCESS' | 'FAILED' | 'DENIED' | 'PROBING_ALERT';
  durationMs: number;
  message?: string;
  timestamp: string;
}

class SecurityAuditService {
  // Bộ nhớ theo dõi số lần tra cứu đơn thất bại để phát hiện dò quét (Probing Detection)
  // key: staffId -> danh sách mốc thời gian thất bại
  private failedOrderLookups = new Map<string, number[]>();

  // Bộ nhớ khóa tạm thời tài xế vi phạm dò quét
  // key: staffId -> timestamp hết hạn khóa
  private temporaryLockouts = new Map<string, number>();

  // Bộ nhớ đếm tần suất gọi tool theo user (Rate limiting: max 15 calls/min)
  // key: userId -> danh sách mốc thời gian gọi tool
  private toolCallTimestamps = new Map<string, number[]>();

  // Bộ nhớ đếm tần suất chat theo user (Rate limiting: max 20 req/min)
  // key: userId -> danh sách mốc thời gian gửi tin nhắn
  private chatReqTimestamps = new Map<string, number[]>();

  // Bộ nhớ đếm số lượt gọi tool theo phiên chat (Session Quota: max 20 calls/conversation)
  // key: conversationId -> số lần gọi tool
  private sessionToolCounts = new Map<string, number>();

  /**
   * 1. Kiểm tra Rate Limit gửi tin nhắn chat (20 requests / phút / user)
   */
  public checkChatRateLimit(userId?: string): { allowed: boolean; retryAfterSec?: number } {
    if (!userId) return { allowed: true };
    const now = Date.now();
    const timestamps = (this.chatReqTimestamps.get(userId) || []).filter((t) => now - t < 60000);
    if (timestamps.length >= 20) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.ceil((60000 - (now - oldest)) / 1000);
      return { allowed: false, retryAfterSec };
    }
    timestamps.push(now);
    this.chatReqTimestamps.set(userId, timestamps);
    return { allowed: true };
  }

  /**
   * 2. Kiểm tra Rate Limit gọi tool (15 tool calls / phút / user)
   */
  public checkToolRateLimit(userId?: string): { allowed: boolean; retryAfterSec?: number } {
    if (!userId) return { allowed: true };
    const now = Date.now();
    const timestamps = (this.toolCallTimestamps.get(userId) || []).filter((t) => now - t < 60000);
    if (timestamps.length >= 15) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.ceil((60000 - (now - oldest)) / 1000);
      return { allowed: false, retryAfterSec };
    }
    timestamps.push(now);
    this.toolCallTimestamps.set(userId, timestamps);
    return { allowed: true };
  }

  /**
   * 3. Kiểm tra Hạn mức gọi tool theo phiên (Session Quota: max 20 tool calls / conversation)
   */
  public checkSessionToolQuota(conversationId?: string): { allowed: boolean; count: number } {
    if (!conversationId) return { allowed: true, count: 0 };
    const current = this.sessionToolCounts.get(conversationId) || 0;
    if (current >= 20) {
      return { allowed: false, count: current };
    }
    this.sessionToolCounts.set(conversationId, current + 1);
    return { allowed: true, count: current + 1 };
  }

  /**
   * 4. Kiểm tra tài xế có đang bị khóa tạm thời do dò quét đơn hàng hay không
   */
  public isDriverLockedOut(staffId?: string): { locked: boolean; remainingSec?: number } {
    if (!staffId) return { locked: false };
    const lockUntil = this.temporaryLockouts.get(staffId);
    if (lockUntil && Date.now() < lockUntil) {
      const remainingSec = Math.ceil((lockUntil - Date.now()) / 1000);
      return { locked: true, remainingSec };
    }
    if (lockUntil) {
      this.temporaryLockouts.delete(staffId);
    }
    return { locked: false };
  }

  /**
   * 5. Ghi nhận thất bại khi tra cứu đơn hàng và kích hoạt Cảnh báo dò quét (Probing Alert)
   */
  public recordFailedOrderLookup(staffId?: string, orderCode?: string): void {
    if (!staffId) return;
    const now = Date.now();
    const history = (this.failedOrderLookups.get(staffId) || []).filter((t) => now - t < 300000); // trong 5 phút
    history.push(now);
    this.failedOrderLookups.set(staffId, history);

    if (history.length >= 3) {
      const lockUntil = now + 5 * 60 * 1000; // Khóa 5 phút
      this.temporaryLockouts.set(staffId, lockUntil);
      console.warn(
        `[SECURITY_ALERT] Phát hiện tài xế (staffId: ${staffId}) dò quét liên tiếp ${history.length} mã đơn không hợp lệ (mã gần nhất: ${orderCode}). Tạm khóa quyền tra cứu chi tiết đơn trong 5 phút.`
      );
    }
  }

  /**
   * 6. Ghi nhật ký Audit Log bảo mật cho từng lần gọi Tool
   */
  public logToolExecution(entry: {
    userId?: string;
    staffId?: string;
    role?: string;
    toolName: string;
    params: Record<string, any>;
    status: 'SUCCESS' | 'FAILED' | 'DENIED' | 'PROBING_ALERT';
    durationMs: number;
    message?: string;
  }): void {
    const safeParams = { ...entry.params };
    // Che các thông tin nhạy cảm trong params nếu có
    if (safeParams.phone) safeParams.phone = '***';
    if (safeParams.password) safeParams.password = '***';

    const logItem: SecurityLogEntry = {
      ...entry,
      params: safeParams,
      timestamp: new Date().toISOString(),
    };

    console.log(`[AUDIT_LOG] [${logItem.timestamp}] [${logItem.role || 'UNKNOWN'}] Tool: ${logItem.toolName} | Status: ${logItem.status} | Duration: ${logItem.durationMs}ms | User: ${logItem.userId || 'N/A'}`);
  }

  /**
   * 7. Che dữ liệu nhạy cảm (SĐT, địa chỉ chi tiết) trong toolResult trước khi lưu vào chat_messages
   */
  public maskToolResultForStorage(toolResult: any): any {
    if (!toolResult || typeof toolResult !== 'object') return toolResult;
    try {
      const clone = JSON.parse(JSON.stringify(toolResult));

      const maskRecursive = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'string') {
            if (key.toLowerCase().includes('phone') && obj[key].length >= 9) {
              const cleaned = obj[key].trim();
              obj[key] = `${cleaned.slice(0, 3)}****${cleaned.slice(-3)}`;
            } else if (key === 'receiverPhone' || key === 'senderPhone') {
              obj[key] = '090****567';
            }
          } else if (typeof obj[key] === 'object') {
            maskRecursive(obj[key]);
          }
        }
      };

      maskRecursive(clone);
      return clone;
    } catch (_) {
      return toolResult;
    }
  }
}

export const securityAuditService = new SecurityAuditService();
