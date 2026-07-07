import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';

const router = Router();
const serviceController = new ServiceController();

// GET /api/v1/services - Public route to fetch active services
router.get('/', serviceController.getAll);

export default router;
