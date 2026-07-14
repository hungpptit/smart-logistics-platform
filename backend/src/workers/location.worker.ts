import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

export class LocationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isSyncing = false;

  /**
   * Starts the location synchronization background worker.
   */
  public start(intervalMs: number = 30000): void {
    if (this.intervalId) return;

    console.log(`[LocationWorker] Starting GPS sync worker, interval: ${intervalMs}ms`);
    this.intervalId = setInterval(() => this.syncLocations(), intervalMs);
  }

  /**
   * Stops the location synchronization background worker.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[LocationWorker] Stopped GPS sync worker');
    }
  }

  /**
   * Synchronizes GPS logs stored in Redis to PostgreSQL database in bulk.
   */
  private async syncLocations(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // 1. Get all active route IDs currently tracking location
      const routeIds = await redis.sMembers('active_routes_location_tracking');
      if (!routeIds || routeIds.length === 0) {
        this.isSyncing = false;
        return;
      }

      for (const routeId of routeIds) {
        const historyKey = `driver:location_history:${routeId}`;
        const syncKey = `driver:location_history_sync:${routeId}`;

        // Check if the history key exists in Redis
        const exists = await redis.exists(historyKey);
        if (!exists) {
          // If no history exists, verify if the temporary sync key is also absent
          const syncExists = await redis.exists(syncKey);
          if (!syncExists) {
            // Remove route from active list since no GPS updates are queued
            await redis.sRem('active_routes_location_tracking', routeId);
          }
          continue;
        }

        // Rename the key atomically to swap buffers and avoid race conditions
        try {
          await redis.rename(historyKey, syncKey);
        } catch (renameErr) {
          // If rename fails (e.g. key was deleted/renamed elsewhere), skip this iteration
          continue;
        }

        // Fetch all elements from the sync buffer list
        const items = await redis.lRange(syncKey, 0, -1);
        
        // Delete the sync buffer key
        await redis.del(syncKey);

        if (items && items.length > 0) {
          const parsedLogs = items.map((item) => JSON.parse(item));

          // Prepare data format matching the RouteLocationLog schema
          const dataToInsert = parsedLogs.map((log) => ({
            routeId: log.routeId,
            latitude: log.latitude,
            longitude: log.longitude,
            speedMps: log.speedMps !== null ? log.speedMps : null,
            headingDegrees: log.headingDegrees !== null ? log.headingDegrees : null,
            accuracyMeters: log.accuracyMeters !== null ? log.accuracyMeters : null,
            recordedAt: new Date(log.recordedAt),
          }));

          // Bulk insert logs into PostgreSQL, skipping duplicates if any
          await prisma.routeLocationLog.createMany({
            data: dataToInsert,
            skipDuplicates: true,
          });

          console.log(`[LocationWorker] Synced ${dataToInsert.length} GPS points for route ${routeId} to PostgreSQL`);
        }
      }
    } catch (error) {
      console.error('[LocationWorker] Error syncing GPS logs from Redis to Postgres:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const locationWorker = new LocationWorker();
