```typescript
import { Request, Response, NextFunction } from 'express';
import { UserService, updateProfileSchema } from '../services/userService';
import { validate } from '../utils/validation';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/appErrors';

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    async getMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId; // Set by authMiddleware
            if (!userId) {
                // This should ideally not happen if authMiddleware is correctly applied
                throw new NotFoundError('User ID not found in request context.');
            }
            const user = await this.userService.findUserById(userId);
            res.status(200).json({ success: true, user });
        } catch (error) {
            next(error);
        }
    }

    async updateMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;
            if (!userId) {
                throw new NotFoundError('User ID not found in request context.');
            }

            validate(updateProfileSchema, req.body); // Validate request body

            const updatedUser = await this.userService.updateProfile(userId, req.body);
            logger.info(`User profile updated: ${userId}`);
            res.status(200).json({ success: true, message: 'Profile updated successfully.', user: updatedUser });
        } catch (error) {
            next(error);
        }
    }
}
```