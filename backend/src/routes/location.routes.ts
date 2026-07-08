import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new LocationController();

router.get('/provinces', authMiddleware, controller.getProvinces);
router.get('/provinces/:provinceCode/wards', authMiddleware, controller.getWardsByProvince);

export default router;
