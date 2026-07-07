import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dtos/auth.dto';

const router = Router();
const authController = new AuthController();

// Register new user (max 5 requests per minute)
router.post(
  '/register',
  rateLimiter(5, 60 * 1000),
  validationMiddleware(RegisterDto),
  authController.register
);

// Login (max 10 requests per minute)
router.post(
  '/login',
  rateLimiter(10, 60 * 1000),
  validationMiddleware(LoginDto),
  authController.login
);

// Refresh Token
router.post(
  '/refresh',
  validationMiddleware(RefreshTokenDto),
  authController.refresh
);

// Logout
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

// Get current user profile
router.get(
  '/me',
  authMiddleware,
  authController.getProfile
);

export default router;
