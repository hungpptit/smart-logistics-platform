import { Router } from 'express';
import { DriverController } from '../controllers/driver.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateDriverDto, UpdateDriverDto } from '../dtos/driver.dto';

const router = Router();
const driverController = new DriverController();

// Require auth and specific roles for all driver management operations
router.use(authMiddleware);
router.use(requireRoles(['ADMIN', 'STAFF']));

router.post(
  '/',
  validationMiddleware(CreateDriverDto),
  driverController.create
);

router.get(
  '/',
  driverController.getAll
);

router.get(
  '/unlinked-users/shipper',
  driverController.getUnlinkedUsers
);

router.get(
  '/:id',
  driverController.getById
);

router.put(
  '/:id',
  validationMiddleware(UpdateDriverDto),
  driverController.update
);

router.delete(
  '/:id',
  driverController.delete
);

export default router;
