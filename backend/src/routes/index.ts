import { Router } from 'express';
import authRouter from './auth.routes';
import customerRouter from './customer.routes';
import facilityRouter from './facility.routes';
import orderRouter from './order.routes';
import serviceRouter from './service.routes';
import driverRouter from './driver.routes';
import locationRouter from './location.routes';
import staffRouter from './staff.routes';
import routingRouter from './routing.routes';
import settingRouter from './setting.routes';
import vehicleRouter from './vehicle.routes';
import shipmentRouter from './shipment.routes';

const router = Router();

// Mount modules
router.use('/auth', authRouter);
router.use('/customers', customerRouter);
router.use('/facilities', facilityRouter);
router.use('/orders', orderRouter);
router.use('/services', serviceRouter);
router.use('/drivers', driverRouter);
router.use('/locations', locationRouter);
router.use('/staff', staffRouter);
router.use('/routes', routingRouter);
router.use('/settings', settingRouter);
router.use('/vehicles', vehicleRouter);
router.use('/shipments', shipmentRouter);

export default router;
