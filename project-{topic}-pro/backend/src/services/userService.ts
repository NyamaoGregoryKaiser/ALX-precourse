```typescript
import { AppDataSource } from '../config/data-source';
import { User } from '../database/entities/User';
import { NotFoundError } from '../utils/appErrors';
import { z } from 'zod';

// Zod schema for profile updates
export const updateProfileSchema = z.object({
    username: z.string().min(3).max(50).optional(),
    email: z.string().email().max(100).optional(),
    // Password update would typically be a separate endpoint for security
});

export class UserService {
    private userRepository = AppDataSource.getRepository(User);

    async findUserById(id: string): Promise<Partial<User>> {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'username', 'email', 'createdAt', 'updatedAt'], // Exclude password
        });
        if (!user) {
            throw new NotFoundError('User not found.');
        }
        return user;
    }

    async updateProfile(userId: string, updateData: z.infer<typeof updateProfileSchema>): Promise<Partial<User>> {
        // Validate input using Zod
        const validatedData = updateProfileSchema.parse(updateData);

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundError('User not found.');
        }

        // Apply updates
        Object.assign(user, validatedData);
        await this.userRepository.save(user);

        const { password, ...updatedUserWithoutPassword } = user;
        return updatedUserWithoutPassword;
    }
}
```