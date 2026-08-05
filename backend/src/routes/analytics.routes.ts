import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Protect analytics routes with auth middleware
router.use(authMiddleware as any);

/**
 * @route GET /api/v1/analytics/overview
 * @desc Get overview analytics metrics
 */
router.get('/overview', analyticsController.getOverview);

export default router;
