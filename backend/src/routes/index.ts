import { Router } from 'express';
import authRouter from './auth.routes';

const router = Router();

// Mount modules
router.use('/auth', authRouter);

export default router;
