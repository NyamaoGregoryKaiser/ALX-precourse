import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware';
import { UserRole } from '../entities/User';

const router = Router();
const authController = new AuthController();

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);

router.get('/me', protect, authController.getMe);

// Example of admin registration - should be highly restricted in production
router.post('/register-admin', protect, authorize(UserRole.ADMIN), authController.register);

export default router;