```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../config/winston';

class JwtService {
  generateToken(userId: string): string {
    const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
    logger.debug(`Generated JWT for user: ${userId}`);
    return token;
  }

  verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      return decoded;
    } catch (error) {
      logger.warn('JWT verification failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // In a more complex scenario, you might blacklist tokens in Redis
  // async blacklistToken(token: string): Promise<void> {
  //   const decoded = this.verifyToken(token);
  //   if (decoded && decoded.exp) {
  //     const expiresIn = decoded.exp - Math.floor(Date.now() / 1000); // Remaining time in seconds
  //     await redisClient.set(`blacklist:${token}`, 'true', { EX: expiresIn });
  //     logger.info(`Token blacklisted for ${decoded.userId} for ${expiresIn} seconds`);
  //   }
  // }
}

export const jwtService = new JwtService();
```