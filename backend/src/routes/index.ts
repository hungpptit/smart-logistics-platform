import { Router } from 'express';
import authRouter from './auth.routes';
import customerRouter from './customer.routes';
import facilityRouter from './facility.routes';
import orderRouter from './order.routes';
import serviceRouter from './service.routes';

const router = Router();

// Mount modules
router.use('/auth', authRouter);
router.use('/customers', customerRouter);
router.use('/facilities', facilityRouter);
router.use('/orders', orderRouter);
router.use('/services', serviceRouter);

export default router;
