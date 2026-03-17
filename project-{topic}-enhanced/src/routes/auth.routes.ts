```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/AuthService';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

/**
 * @file Authentication routes.
 *
 * Defines the API endpoints for user registration and login.
 * These routes are publicly accessible.
 */

const router = Router();
const authService = new AuthService(AppDataSource.getRepository(User));
const authController = new AuthController(authService);

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

export default router;
```