import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';

const router = Router();
const authController = new AuthController();

// Register new user
router.post(
  '/register',
  validationMiddleware(RegisterDto),
  authController.register
);

// Login
router.post(
  '/login',
  validationMiddleware(LoginDto),
  authController.login
);

// Get current user profile
router.get(
  '/me',
  authMiddleware,
  authController.getProfile
);

export default router;
