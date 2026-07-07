import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateOrderDto, UpdateOrderStatusDto } from '../dtos/order.dto';

const router = Router();
const orderController = new OrderController();

// All order routes require authentication
router.use(authMiddleware);

// Create order
router.post(
  '/',
  validationMiddleware(CreateOrderDto),
  orderController.create
);

// Get list of orders (filtered by owner/role in service)
router.get(
  '/',
  orderController.getAll
);

// Get order detail
router.get(
  '/:id',
  orderController.getById
);

// Cancel order
router.post(
  '/:id/cancel',
  orderController.cancel
);

// Update status (Admin/Staff only)
router.put(
  '/:id/status',
  requireRoles(['ADMIN', 'STAFF']),
  validationMiddleware(UpdateOrderStatusDto),
  orderController.updateStatus
);

export default router;
