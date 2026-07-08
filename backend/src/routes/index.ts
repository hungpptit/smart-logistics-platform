import { Router } from 'express';
import authRouter from './auth.routes';
import customerRouter from './customer.routes';
import facilityRouter from './facility.routes';
import orderRouter from './order.routes';
import serviceRouter from './service.routes';
import driverRouter from './driver.routes';
import locationRouter from './location.routes';

const router = Router();

// Mount modules
router.use('/auth', authRouter);
router.use('/customers', customerRouter);
router.use('/facilities', facilityRouter);
router.use('/orders', orderRouter);
router.use('/services', serviceRouter);
router.use('/drivers', driverRouter);
router.use('/locations', locationRouter);

export default router;
