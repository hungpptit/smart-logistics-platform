import { Router } from 'express';
import { FacilityController } from '../controllers/facility.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';
import { CreateFacilityDto, UpdateFacilityDto, CreateFacilityZoneDto, UpdateFacilityZoneDto } from '../dtos/facility.dto';

const router = Router();
const facilityController = new FacilityController();

// All facility routes require authentication and STAFF/ADMIN role
router.use(authMiddleware);
router.use(requireRoles(['ADMIN', 'STAFF']));

// CRUD Facilities
router.post(
  '/',
  validationMiddleware(CreateFacilityDto),
  facilityController.create
);

router.get(
  '/',
  facilityController.getAll
);

router.get(
  '/:id',
  facilityController.getById
);

router.put(
  '/:id',
  validationMiddleware(UpdateFacilityDto),
  facilityController.update
);

router.delete(
  '/:id',
  facilityController.delete
);

// --- Cargo Zone Routes ---

router.post(
  '/:id/zones',
  validationMiddleware(CreateFacilityZoneDto),
  facilityController.createZone
);

router.get(
  '/:id/zones',
  facilityController.getZones
);

router.put(
  '/:id/zones/:zoneId',
  validationMiddleware(UpdateFacilityZoneDto),
  facilityController.updateZone
);

router.delete(
  '/:id/zones/:zoneId',
  facilityController.deleteZone
);

export default router;
