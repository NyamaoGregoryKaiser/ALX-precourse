import { Router } from 'express';
import userController from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

// Utility for wrapping async functions to catch errors
function catchAsync(fn: Function) {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

router.get('/me', authenticateToken, catchAsync(userController.getMyProfile));
router.put('/me', authenticateToken, catchAsync(userController.updateMyProfile));
router.get('/', authenticateToken, catchAsync(userController.getAllUsers)); // Get all users for listing/starting new chats

export default router;