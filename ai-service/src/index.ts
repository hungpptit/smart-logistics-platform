import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { KMeansService } from './services/kmeans.service';
import {
  DISTANCE_RULE_VERSION,
  resolveClusterRouteFlags,
  VRPService,
} from './services/vrp.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const kmeansService = new KMeansService();
const vrpService = new VRPService();

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Smart Logistics AI Microservice (VRP + K-Means)',
    port: PORT,
  });
});

app.post('/api/v1/ai/optimize', async (req: Request, res: Response) => {
  try {
    const { orders, facilityLocation, k, returnToHub, includeStartFromHub, routeType } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách đơn hàng không hợp lệ',
      });
    }

    if (!facilityLocation || facilityLocation.lat === undefined || facilityLocation.lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Tọa độ kho bãi không hợp lệ',
      });
    }

    const targetK = k || 3;
    const hasExplicitRouteType = typeof routeType === 'string' && routeType.trim().length > 0;
    console.log(`[AI Microservice] Processing optimization for ${orders.length} orders into ${targetK} clusters (routeType: ${routeType || 'custom'})...`);
    const startTime = Date.now();

    // 1. Run K-Means Clustering
    const rawClusters = kmeansService.clusterOrders(orders, targetK);

    // 2. Run Genetic Algorithm VRP on each cluster sequentially to respect external API rate limits
    const optimizedClusters = [];
    for (const cluster of rawClusters) {
      const clusterFlags = hasExplicitRouteType
        ? resolveClusterRouteFlags(cluster.orders, routeType)
        : {
            includeStartFromHub: typeof includeStartFromHub === 'boolean' ? includeStartFromHub : true,
            returnToHub: returnToHub === true,
            distanceRule:
              returnToHub === true && includeStartFromHub === false
                ? 'PICKUP'
                : includeStartFromHub !== false && returnToHub !== true
                  ? 'DELIVERY'
                  : 'ROUND_TRIP',
          };

      const res = await vrpService.optimizeRouteWithMetrics(
        cluster.orders,
        facilityLocation,
        new Date(),
        clusterFlags.returnToHub,
        undefined,
        clusterFlags.includeStartFromHub
      );
      optimizedClusters.push({
        ...cluster,
        orders: res.orders,
        plannedDistanceKm: res.metrics.plannedDistanceKm,
        plannedDurationMin: res.metrics.plannedDurationMin,
        matrixSource: res.metrics.matrixSource,
        appliedIncludeStartFromHub: clusterFlags.includeStartFromHub,
        appliedReturnToHub: clusterFlags.returnToHub,
        distanceRule: clusterFlags.distanceRule,
      });
    }

    const overallMatrixSource = optimizedClusters.every((c) => c.matrixSource === 'goong')
      ? 'goong'
      : optimizedClusters.some((c) => c.matrixSource === 'goong')
        ? 'mixed (goong + osrm)'
        : optimizedClusters[0]?.matrixSource || 'osrm';

    const durationMs = Date.now() - startTime;
    console.log(`[AI Microservice] Optimization complete in ${durationMs}ms (source: ${overallMatrixSource})`);

    return res.json({
      success: true,
      message: 'AI optimization completed successfully on dedicated microservice',
      executionTimeMs: durationMs,
      matrixSource: overallMatrixSource,
      distanceRuleVersion: DISTANCE_RULE_VERSION,
      data: {
        matrixSource: overallMatrixSource,
        distanceRuleVersion: DISTANCE_RULE_VERSION,
        clusters: optimizedClusters,
      },
    });
  } catch (error) {
    console.error('[AI Microservice Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý thuật toán AI gom cụm',
      error: (error as Error).message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Smart Logistics AI Microservice is running on http://localhost:${PORT}`);
});
