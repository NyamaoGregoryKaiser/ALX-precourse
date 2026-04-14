import { Router } from 'express';
import * as authController from './auth.controller';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.get('/me', authMiddleware, authController.getMe); // Get current user's profile

export default router;