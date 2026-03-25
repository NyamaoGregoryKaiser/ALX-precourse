import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { User } from '../database/entities/User';
import { CustomError } from '../middleware/errorHandler';
import jwt from 'jsonwebtoken';
import { validate } from 'class-validator';
import redisClient from '../config/redis';
import logger from '../config/logger';

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

class AuthService {
    private userRepository: Repository<User>;
    private readonly jwtSecret: string;
    private readonly jwtRefreshSecret: string;
    private readonly accessTokenExpiration: string;
    private readonly refreshTokenExpiration: string;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
        this.accessTokenExpiration = process.env.ACCESS_TOKEN_EXPIRATION || '15m';
        this.refreshTokenExpiration = process.env.REFRESH_TOKEN_EXPIRATION || '7d';

        if (this.jwtSecret === 'fallback_secret' || this.jwtRefreshSecret === 'fallback_refresh_secret') {
            logger.warn('JWT secrets are using fallback values. Set JWT_SECRET and JWT_REFRESH_SECRET in your .env for production.');
        }
    }

    private generateTokens(userId: string): { accessToken: string; refreshToken: string } {
        const accessToken = jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.accessTokenExpiration });
        const refreshToken = jwt.sign({ userId }, this.jwtRefreshSecret, { expiresIn: this.refreshTokenExpiration });
        return { accessToken, refreshToken };
    }

    private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
        // Store refresh token with user ID as key, and set expiration
        await redisClient.set(`refreshToken:${userId}`, refreshToken, 'EX', this.convertExpirationToSeconds(this.refreshTokenExpiration));
        logger.debug(`Refresh token stored for user ${userId}`);
    }

    private async getStoredRefreshToken(userId: string): Promise<string | null> {
        return redisClient.get(`refreshToken:${userId}`);
    }

    private async deleteRefreshToken(userId: string): Promise<void> {
        await redisClient.del(`refreshToken:${userId}`);
        logger.debug(`Refresh token deleted for user ${userId}`);
    }

    private convertExpirationToSeconds(expiration: string): number {
        const value = parseInt(expiration);
        const unit = expiration.slice(-1);

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            default: return 60 * 60; // Default to 1 hour if unit is unknown
        }
    }

    async register(username: string, email: string, passwordPlain: string): Promise<AuthTokens> {
        const existingUser = await this.userRepository.findOne({ where: [{ email }, { username }] });
        if (existingUser) {
            throw new CustomError('User with that email or username already exists.', 409, 'USER_EXISTS');
        }

        const user = new User();
        user.username = username;
        user.email = email;
        user.password = passwordPlain; // Temporarily assign plain password for hashing

        const errors = await validate(user, { groups: ['registration'] }); // Use validation groups if needed
        if (errors.length > 0) {
            const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
            throw new CustomError('Validation failed.', 400, 'VALIDATION_FAILED', errorMessages);
        }

        await user.hashPassword(); // Hash the password
        await this.userRepository.save(user);

        const { accessToken, refreshToken } = this.generateTokens(user.id);
        await this.storeRefreshToken(user.id, refreshToken);

        logger.info(`User registered successfully: ${user.email}`);

        return {
            accessToken,
            refreshToken,
            user: { id: user.id, username: user.username, email: user.email },
        };
    }

    async login(email: string, passwordPlain: string): Promise<AuthTokens> {
        const user = await this.userRepository.findOneBy({ email });
        if (!user) {
            throw new CustomError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
        }

        const isPasswordValid = await user.comparePassword(passwordPlain);
        if (!isPasswordValid) {
            throw new CustomError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
        }

        const { accessToken, refreshToken } = this.generateTokens(user.id);
        await this.storeRefreshToken(user.id, refreshToken);

        logger.info(`User logged in successfully: ${user.email}`);

        return {
            accessToken,
            refreshToken,
            user: { id: user.id, username: user.username, email: user.email },
        };
    }

    async refreshToken(userId: string, currentRefreshToken: string): Promise<{ accessToken: string }> {
        const storedToken = await this.getStoredRefreshToken(userId);

        if (!storedToken || storedToken !== currentRefreshToken) {
            // If the provided refresh token doesn't match the stored one, or is missing
            // This could indicate token hijacking, so we invalidate all refresh tokens for this user.
            if (storedToken) {
                logger.warn(`Potential refresh token reuse detected for user ${userId}. Invalidating all tokens.`);
                await this.deleteRefreshToken(userId);
            }
            throw new CustomError('Invalid or expired refresh token. Please login again.', 403, 'INVALID_REFRESH_TOKEN');
        }

        try {
            jwt.verify(currentRefreshToken, this.jwtRefreshSecret);
        } catch (error) {
            logger.error(`Refresh token verification failed for user ${userId}: ${error}`);
            await this.deleteRefreshToken(userId); // Invalidate the expired/invalid token
            throw new CustomError('Invalid or expired refresh token. Please login again.', 403, 'REFRESH_TOKEN_EXPIRED');
        }

        const { accessToken, refreshToken } = this.generateTokens(userId);
        await this.storeRefreshToken(userId, refreshToken); // Store the new refresh token

        logger.info(`Access token refreshed for user ${userId}`);

        return { accessToken };
    }

    async logout(userId: string): Promise<void> {
        await this.deleteRefreshToken(userId);
        logger.info(`User logged out and refresh token invalidated: ${userId}`);
    }
}

export default new AuthService();