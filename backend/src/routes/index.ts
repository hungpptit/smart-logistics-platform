import { Router } from 'express';
import authRouter from './auth.routes';
import customerRouter from './customer.routes';
import facilityRouter from './facility.routes';
import orderRouter from './order.routes';

const router = Router();

// Mount modules
router.use('/auth', authRouter);
router.use('/customers', customerRouter);
router.use('/facilities', facilityRouter);
router.use('/orders', orderRouter);

export default router;
