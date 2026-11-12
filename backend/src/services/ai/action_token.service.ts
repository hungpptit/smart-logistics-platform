import { randomUUID } from 'crypto';
import { redis } from '../../config/redis';

export type ActionType =
  | 'CANCEL_ORDER'
  | 'UPDATE_DELIVERY_INFO'
  | 'RESCHEDULE_DELIVERY'
  | 'CONFIRM_CREATE_ORDER';

export interface ActionPayload {
  actionType: ActionType;
  orderId?: string;
  orderCode?: string;
  customerId: string;
  summary: string;
  details: Record<string, any>;
  expiresAt: number;
}

/**
 * Service quản lý Token xác nhận hành động 2 bước (Human-in-the-Loop)
 * Lưu trữ trên Redis (TTL 5 phút) kèm fallback bộ nhớ đệm an toàn
 */
export class ActionTokenService {
  private memoryCache = new Map<string, ActionPayload>();

  /**
   * Khởi tạo token xác nhận (mặc định hết hạn sau 5 phút = 300 giây)
   */
  public async createToken(
    payload: Omit<ActionPayload, 'expiresAt'>,
    ttlSeconds: number = 300
  ): Promise<string> {
    const token = `act_${randomUUID().replace(/-/g, '')}`;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const fullPayload: ActionPayload = { ...payload, expiresAt };

    try {
      if (redis.isOpen) {
        await redis.setEx(`chat:action:${token}`, ttlSeconds, JSON.stringify(fullPayload));
      } else {
        this.memoryCache.set(token, fullPayload);
      }
    } catch (err) {
      console.warn('[ActionTokenService] Không thể ghi vào Redis, dùng fallback memory cache:', err);
      this.memoryCache.set(token, fullPayload);
    }

    return token;
  }

  /**
   * Xác thực và thu hồi token (Burn Once - Ngăn chặn Replay Attack)
   */
  public async verifyAndConsumeToken(
    token: string,
    expectedActionType: ActionType,
    customerId: string
  ): Promise<ActionPayload | null> {
    let rawData: string | null = null;
    let payload: ActionPayload | null = null;

    try {
      if (redis.isOpen) {
        rawData = await redis.get(`chat:action:${token}`);
        if (rawData) {
          payload = JSON.parse(rawData);
          await redis.del(`chat:action:${token}`); // Hủy ngay sau khi dùng
        }
      }
    } catch (err) {
      console.warn('[ActionTokenService] Lỗi đọc Redis, kiểm tra memory cache:', err);
    }

    if (!payload && this.memoryCache.has(token)) {
      payload = this.memoryCache.get(token)!;
      this.memoryCache.delete(token); // Hủy ngay sau khi dùng
    }

    if (!payload) {
      return null;
    }

    // Kiểm tra hết hạn
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    // Kiểm tra đúng loại hành động và đúng khách hàng sở hữu (Chống IDOR)
    if (payload.actionType !== expectedActionType || payload.customerId !== customerId) {
      return null;
    }

    return payload;
  }

  /**
   * Hủy bỏ token khi người dùng từ chối / bấm hủy trên giao diện
   */
  public async revokeToken(token: string): Promise<void> {
    try {
      if (redis.isOpen) {
        await redis.del(`chat:action:${token}`);
      }
    } catch (err) {
      console.warn('[ActionTokenService] Lỗi khi xóa Redis token:', err);
    }
    this.memoryCache.delete(token);
  }
}

export const actionTokenService = new ActionTokenService();
