import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware';

const router = Router();
const staffController = new StaffController();

// All staff routes require ADMIN role
router.use(authMiddleware);
router.use(requireRoles(['ADMIN']));

router.get('/', staffController.getAll);
router.get('/:id', staffController.getById);
router.post('/', staffController.create);
router.put('/:id', staffController.update);
router.delete('/:id', staffController.delete);

export default router;
