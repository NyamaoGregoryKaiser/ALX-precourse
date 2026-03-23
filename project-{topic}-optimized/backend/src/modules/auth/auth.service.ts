```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/appError';
import { UserRepository } from '../users/user.repository';
import { User, UserRole } from '../../database/entities/User';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/constants';
import { logger } from '../../services/logger.service';

export class AuthService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    private createToken(userId: string): string {
        return jwt.sign({ id: userId }, JWT_SECRET!, {
            expiresIn: JWT_EXPIRES_IN,
        });
    }

    public async register(username: string, email: string, password: string, role: UserRole): Promise<{ user: User, token: string }> {
        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new AppError('User with this email already exists.', 409); // Conflict
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const newUser = await this.userRepository.create({
            username,
            email,
            password: hashedPassword,
            role,
        });

        const token = this.createToken(newUser.id);
        logger.info(`New user registered: ${newUser.email} with role ${newUser.role}`);
        return { user: newUser, token };
    }

    public async login(email: string, password: string): Promise<{ user: User, token: string }> {
        // Check if user exists and select password
        const user = await this.userRepository.findByEmailWithPassword(email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new AppError('Incorrect email or password.', 401); // Unauthorized
        }

        const token = this.createToken(user.id);
        logger.info(`User logged in: ${user.email}`);
        return { user, token };
    }

    // A simple method to verify a token (for middleware)
    public verifyToken(token: string): string {
        try {
            const decoded = jwt.verify(token, JWT_SECRET!) as { id: string };
            return decoded.id;
        } catch (error) {
            logger.error('Token verification failed:', error);
            throw new AppError('Invalid or expired token.', 401);
        }
    }
}
```