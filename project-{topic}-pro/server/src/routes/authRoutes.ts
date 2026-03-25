import { Router } from 'express';
import authController from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { loginRateLimiter } from '../middleware/rateLimitMiddleware';
import { catchAsync } from '../utils/catchAsync'; // A simple utility to wrap async controllers

const router = Router();

// Utility for wrapping async functions to catch errors
function catchAsync(fn: Function) {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

router.post('/register', catchAsync(authController.register));
router.post('/login', loginRateLimiter, catchAsync(authController.login));
router.post('/refresh-token', authenticateToken, catchAsync(authController.refreshToken)); // Refresh tokens should be authenticated to prevent arbitrary token generation
router.post('/logout', authenticateToken, catchAsync(authController.logout));

export default router;