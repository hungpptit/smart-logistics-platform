import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requirePermissions } from '../middlewares/auth.middleware';
import { CreateCustomerDto, UpdateCustomerDto, CreateAddressDto, UpdateAddressDto } from '../dtos/customer.dto';

const router = Router();
const customerController = new CustomerController();

// All customer routes require authentication
router.use(authMiddleware);

// CRUD Customers
router.post(
  '/',
  requirePermissions(['CUSTOMER_MANAGE']),
  validationMiddleware(CreateCustomerDto),
  customerController.create
);

router.get(
  '/',
  requirePermissions(['CUSTOMER_VIEW']),
  customerController.getAll
);

router.get(
  '/:id',
  customerController.getById
);

router.put(
  '/:id',
  validationMiddleware(UpdateCustomerDto),
  customerController.update
);

router.delete(
  '/:id',
  requirePermissions(['CUSTOMER_MANAGE']),
  customerController.delete
);

// --- Address Book Routes ---

router.post(
  '/:id/addresses',
  validationMiddleware(CreateAddressDto),
  customerController.addAddress
);

router.get(
  '/:id/addresses',
  customerController.getAddresses
);

router.put(
  '/:id/addresses/:addressId',
  validationMiddleware(UpdateAddressDto),
  customerController.updateAddress
);

router.delete(
  '/:id/addresses/:addressId',
  customerController.deleteAddress
);

export default router;
