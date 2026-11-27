import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { assertStaffCanSupportDriver } from '../services/ai/driver_support_auth.util';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_slp_2026';

interface AuthenticatedSocketUser {
  id: string;
  roles: string[];
}

let trackingGatewayInstance: TrackingGateway | null = null;

export function getTrackingGateway(): TrackingGateway | null {
  return trackingGatewayInstance;
}

export class TrackingGateway {
  private io: Server;
  // Theo dõi các socket đang mở màn hình chat theo userId để tránh nhảy badge khi tài xế đang đọc trực tiếp
  private activeChatScreenUsers: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    trackingGatewayInstance = this;
    this.setupListeners();
  }

  public isUserInChatScreen(userId: string): boolean {
    if (!userId) return false;
    return (this.activeChatScreenUsers.get(userId)?.size ?? 0) > 0;
  }

  public emitDriverUnreadUpdated(userId: string, unreadCount: number): void {
    if (this.io && userId) {
      this.io.to(`user:${userId}`).emit('chat:unread_updated', { unreadCount });
    }
  }

  public emitDriverNewMessage(userId: string, payload: Record<string, any>): void {
    if (this.io && userId) {
      this.io.to(`user:${userId}`).emit('chat:new_message', payload);
    }
  }

  public emitStaffDriverMessage(driverUserId: string, payload: Record<string, any>): void {
    if (this.io && driverUserId) {
      this.io.to(`chat:driver:${driverUserId}`).emit('chat:staff_driver_message', {
        ...payload,
        driverUserId,
      });
    }
  }

  private addActiveChatSocket(userId: string, socketId: string): void {
    let set = this.activeChatScreenUsers.get(userId);
    if (!set) {
      set = new Set<string>();
      this.activeChatScreenUsers.set(userId, set);
    }
    set.add(socketId);
  }

  private removeActiveChatSocket(userId: string | undefined, socketId: string): void {
    if (!userId) return;
    const set = this.activeChatScreenUsers.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
      this.activeChatScreenUsers.delete(userId);
    }
  }

  private extractBearerToken(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }
    const headerAuth = socket.handshake.headers?.authorization;
    if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
      const token = headerAuth.slice(7).trim();
      return token || null;
    }
    return null;
  }

  private async authenticateSocket(
    socket: Socket,
    isDisconnectedRef: { disconnected: boolean }
  ): Promise<AuthenticatedSocketUser | null> {
    const token = this.extractBearerToken(socket);
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
      if (!decoded?.id) return null;

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          status: true,
          role: { select: { roleCode: true } },
        },
      });

      if (!user || user.status !== 'ACTIVE' || isDisconnectedRef.disconnected) {
        return null;
      }

      const authUser: AuthenticatedSocketUser = {
        id: user.id,
        roles: user.role ? [user.role.roleCode] : [],
      };
      socket.data.user = authUser;
      socket.join(`user:${user.id}`);
      console.log(`[Socket] Authenticated socket ${socket.id} joined room user:${user.id}`);
      return authUser;
    } catch {
      // Giữ kết nối cho luồng Public Tracking nếu token hết hạn/không hợp lệ, nhưng không join room user
      return null;
    }
  }

  public broadcastRoutesUpdated(): void {
    if (this.io) {
      this.io.emit('routes_updated');
      this.io.emit('route:assigned');
      this.io.emit('route:reset');
      console.log('[Socket] Broadcasted routes_updated to all clients');
    }
  }

  public broadcastDutyStatusChanged(driverId: string, userId: string, status: string): void {
    if (this.io) {
      this.io.emit('driver:duty_status_changed', { driverId, userId, status });
      this.io.to('admin:monitoring').emit('driver:duty_status_changed', { driverId, userId, status });
      console.log(`[Socket] Broadcasted driver:duty_status_changed: driverId=${driverId}, status=${status}`);
    }
  }

  private setupListeners(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);
      const disconnectState = { disconnected: false };
      const authReadyPromise = this.authenticateSocket(socket, disconnectState);

      // 1. Join room for a specific route (For Driver or Customer tracking a specific route)
      socket.on('join:route', (data: { routeId: string }) => {
        if (data && data.routeId) {
          socket.join(`route:${data.routeId}`);
          console.log(`[Socket] Client ${socket.id} joined room: route:${data.routeId}`);
        }
      });

      // 2. Join room for Admin monitoring dashboard
      socket.on('join:admin', () => {
        socket.join('admin:monitoring');
        console.log(`[Socket] Client ${socket.id} joined admin monitoring room`);
      });

      // 3. Leave room
      socket.on('leave:route', (data: { routeId: string }) => {
        if (data && data.routeId) {
          socket.leave(`route:${data.routeId}`);
          console.log(`[Socket] Client ${socket.id} left room: route:${data.routeId}`);
        }
      });

      socket.on('leave:admin', () => {
        socket.leave('admin:monitoring');
        console.log(`[Socket] Client ${socket.id} left admin monitoring room`);
      });

      // 4. Đánh dấu tài xế đang mở/đóng màn hình chat để tránh nhảy badge chưa đọc sai
      socket.on('chat:screen_opened', async (data: { isOpen?: boolean }) => {
        const authUser: AuthenticatedSocketUser | null =
          socket.data.user || (await authReadyPromise);
        if (!authUser || disconnectState.disconnected) return;

        if (data?.isOpen) {
          this.addActiveChatSocket(authUser.id, socket.id);
        } else {
          this.removeActiveChatSocket(authUser.id, socket.id);
        }
      });

      // 5. Nhân viên Kho / Admin tham gia room hỗ trợ tài xế (xác thực JWT + đúng kho)
      socket.on(
        'join:driver_chat',
        async (
          data: { driverUserId?: string },
          ack?: (res: { success: boolean; message?: string }) => void
        ) => {
          const authUser: AuthenticatedSocketUser | null =
            socket.data.user || (await authReadyPromise);
          if (!authUser) {
            ack?.({ success: false, message: 'Chưa xác thực tài khoản Socket.' });
            socket.emit('chat:driver_error', { message: 'Chưa xác thực tài khoản Socket.' });
            return;
          }

          const driverUserId = typeof data?.driverUserId === 'string' ? data.driverUserId.trim() : '';
          if (!driverUserId) {
            ack?.({ success: false, message: 'Thiếu driverUserId.' });
            return;
          }

          try {
            await assertStaffCanSupportDriver(authUser.id, authUser.roles, driverUserId);
            socket.join(`chat:driver:${driverUserId}`);
            ack?.({ success: true });
          } catch (err: any) {
            const msg = err?.message || 'Không có quyền truy cập phòng chat tài xế này.';
            ack?.({ success: false, message: msg });
            socket.emit('chat:driver_error', { driverUserId, message: msg });
          }
        }
      );

      socket.on('leave:driver_chat', (data: { driverUserId?: string }) => {
        const driverUserId = typeof data?.driverUserId === 'string' ? data.driverUserId.trim() : '';
        if (driverUserId) {
          socket.leave(`chat:driver:${driverUserId}`);
        }
      });

      // 6. Listen for driver GPS updates
      socket.on('driver:update_location', async (data: {
        routeId: string;
        latitude: number;
        longitude: number;
        speedMps?: number;
      }) => {
        const { routeId, latitude, longitude, speedMps } = data;

        if (!routeId || latitude === undefined || longitude === undefined) {
          console.warn('[Socket] Invalid location update received:', data);
          return;
        }

        const locationUpdate = {
          routeId,
          latitude,
          longitude,
          speedMps: speedMps ?? null,
          recordedAt: new Date().toISOString()
        };

        const jsonStr = JSON.stringify(locationUpdate);

        try {
          // A. Save the latest location in Redis for quick access (HSET or SET)
          await redis.set(`driver:location:${routeId}`, jsonStr);

          // B. Add route to active routes set and push location update to history list for batch insert
          await Promise.all([
            redis.sAdd('active_routes_location_tracking', routeId),
            redis.rPush(`driver:location_history:${routeId}`, jsonStr)
          ]);

          // C. Broadcast to clients tracking this specific route
          this.io.to(`route:${routeId}`).emit('driver:location_changed', locationUpdate);

          // D. Broadcast to Admin Command Center
          this.io.to('admin:monitoring').emit('driver:location_changed', locationUpdate);

          console.log(`[Socket] GPS update broadcasted for route ${routeId}: [${latitude}, ${longitude}]`);
        } catch (error) {
          console.error('[Socket] Error saving location update to Redis:', error);
        }
      });

      socket.on('disconnect', () => {
        disconnectState.disconnected = true;
        this.removeActiveChatSocket(socket.data.user?.id, socket.id);
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }
}
