import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { UserRole } from '../db/entities/User';

const router = Router();

router.post('/register', authController.register); // Public registration
router.post('/login', authController.login);
router.post('/register-admin', authenticateToken, authorizeRoles(UserRole.ADMIN), authController.register); // Admin-only registration

export default router;