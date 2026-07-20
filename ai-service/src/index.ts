import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { KMeansService } from './services/kmeans.service';
import { VRPService } from './services/vrp.service';

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
    const { orders, facilityLocation, k } = req.body;

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
    console.log(`[AI Microservice] Processing optimization for ${orders.length} orders into ${targetK} clusters...`);
    const startTime = Date.now();

    // 1. Run K-Means Clustering
    const rawClusters = kmeansService.clusterOrders(orders, targetK);

    // 2. Run Genetic Algorithm VRP on each cluster
    const optimizedClusters = await Promise.all(
      rawClusters.map(async (cluster) => {
        const sortedOrders = await vrpService.optimizeRouteStops(cluster.orders, facilityLocation);
        return {
          ...cluster,
          orders: sortedOrders,
        };
      })
    );

    const durationMs = Date.now() - startTime;
    console.log(`[AI Microservice] Optimization complete in ${durationMs}ms`);

    return res.json({
      success: true,
      message: 'AI optimization completed successfully on dedicated microservice',
      executionTimeMs: durationMs,
      data: {
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
