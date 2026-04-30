```typescript
import { AppDataSource } from '../config/data-source';
import { User } from '../database/entities/User';
import { comparePasswords, hashPassword } from '../utils/passwordUtils';
import { generateToken } from '../utils/jwtUtils';
import { BadRequestError, UnauthorizedError } from '../utils/appErrors';
import { z } from 'zod';

// Zod schemas for validation
export const registerSchema = z.object({
    username: z.string().min(3).max(50),
    email: z.string().email().max(100),
    password: z.string().min(6),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export class AuthService {
    private userRepository = AppDataSource.getRepository(User);

    async register(userData: z.infer<typeof registerSchema>): Promise<{ user: Partial<User>; token: string }> {
        // Validate input using Zod
        const validatedData = registerSchema.parse(userData);

        const existingUser = await this.userRepository.findOne({
            where: [{ email: validatedData.email }, { username: validatedData.username }],
        });

        if (existingUser) {
            if (existingUser.email === validatedData.email) {
                throw new BadRequestError('User with this email already exists.');
            }
            if (existingUser.username === validatedData.username) {
                throw new BadRequestError('User with this username already exists.');
            }
        }

        const hashedPassword = await hashPassword(validatedData.password);

        const newUser = this.userRepository.create({
            username: validatedData.username,
            email: validatedData.email,
            password: hashedPassword,
        });

        await this.userRepository.save(newUser);

        const token = generateToken(newUser.id);

        const { password, ...userWithoutPassword } = newUser; // Exclude password from response

        return { user: userWithoutPassword, token };
    }

    async login(credentials: z.infer<typeof loginSchema>): Promise<{ user: Partial<User>; token: string }> {
        // Validate input using Zod
        const validatedData = loginSchema.parse(credentials);

        const user = await this.userRepository.findOne({
            where: { email: validatedData.email },
            select: ['id', 'username', 'email', 'password'], // Explicitly select password for comparison
        });

        if (!user || !(await comparePasswords(validatedData.password, user.password))) {
            throw new UnauthorizedError('Invalid credentials.');
        }

        const token = generateToken(user.id);

        const { password, ...userWithoutPassword } = user; // Exclude password from response

        return { user: userWithoutPassword, token };
    }
}
```