import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { User } from '../database/entities/User';
import { CustomError } from '../middleware/errorHandler';
import { validate } from 'class-validator';
import logger from '../config/logger';

class UserService {
    private userRepository: Repository<User>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
    }

    async getUserProfile(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'username', 'email', 'isOnline', 'createdAt', 'updatedAt'], // Select specific fields for profile
        });

        if (!user) {
            throw new CustomError('User not found.', 404, 'USER_NOT_FOUND');
        }
        logger.debug(`Fetched profile for user: ${userId}`);
        return user;
    }

    async findUserById(userId: string): Promise<User | null> {
        return this.userRepository.findOneBy({ id: userId });
    }

    async findUsersByIds(userIds: string[]): Promise<User[]> {
        return this.userRepository.findByIds(userIds, {
            select: ['id', 'username', 'email'], // Fetch relevant user details
        });
    }

    async updateUserProfile(userId: string, updates: Partial<Pick<User, 'username' | 'email'>>): Promise<User> {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new CustomError('User not found.', 404, 'USER_NOT_FOUND');
        }

        if (updates.username && updates.username !== user.username) {
            const existingUsername = await this.userRepository.findOneBy({ username: updates.username });
            if (existingUsername && existingUsername.id !== userId) {
                throw new CustomError('Username already taken.', 409, 'USERNAME_TAKEN');
            }
            user.username = updates.username;
        }

        if (updates.email && updates.email !== user.email) {
            const existingEmail = await this.userRepository.findOneBy({ email: updates.email });
            if (existingEmail && existingEmail.id !== userId) {
                throw new CustomError('Email already registered.', 409, 'EMAIL_TAKEN');
            }
            user.email = updates.email;
        }

        const errors = await validate(user, { skipMissingProperties: true });
        if (errors.length > 0) {
            const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
            throw new CustomError('Validation failed.', 400, 'VALIDATION_FAILED', errorMessages);
        }

        await this.userRepository.save(user);
        logger.info(`User profile updated for user: ${userId}`);
        return user;
    }

    async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
        await this.userRepository.update(userId, { isOnline });
        logger.debug(`User ${userId} online status set to ${isOnline}`);
    }

    async getAllUsers(currentUser: string): Promise<User[]> {
        return this.userRepository.find({
            where: { id: null }, // Dummy condition to ensure 'select' takes precedence if no other filters
            select: ['id', 'username', 'email', 'isOnline'],
            // Exclude current user from the list if needed for e.g. "discover users" feature
            // where: { id: Not(currentUser) }
        });
    }
}

export default new UserService();