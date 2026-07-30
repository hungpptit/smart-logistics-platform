import { Router } from 'express';
import { TrackingController } from '../controllers/tracking.controller';

const router = Router();
const trackingController = new TrackingController();

// Public route for order tracking lookup
router.get('/public/:code', trackingController.trackOrder);

export default router;
