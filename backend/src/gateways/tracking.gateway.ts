import { Server, Socket } from 'socket.io';
import { redis } from '../config/redis';

let trackingGatewayInstance: TrackingGateway | null = null;

export function getTrackingGateway(): TrackingGateway | null {
  return trackingGatewayInstance;
}

export class TrackingGateway {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    trackingGatewayInstance = this;
    this.setupListeners();
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

      // 4. Listen for driver GPS updates
      socket.on('driver:update_location', async (data: {
        routeId: string;
        latitude: number;
        longitude: number;
        speedMps?: number;
        headingDegrees?: number;
        accuracyMeters?: number;
      }) => {
        const { routeId, latitude, longitude, speedMps, headingDegrees, accuracyMeters } = data;

        if (!routeId || latitude === undefined || longitude === undefined) {
          console.warn('[Socket] Invalid location update received:', data);
          return;
        }

        const locationUpdate = {
          routeId,
          latitude,
          longitude,
          speedMps: speedMps ?? null,
          headingDegrees: headingDegrees ?? null,
          accuracyMeters: accuracyMeters ?? null,
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
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }
}
