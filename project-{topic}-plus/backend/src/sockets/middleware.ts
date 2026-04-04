```typescript
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { jwtService } from '../services/jwt.service';
import { userService } from '../services/user.service';
import { logger } from '../config/winston';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
}

export const authenticateSocket = async (socket: Socket, next: (err?: ExtendedError) => void) => {
  // Get token from handshake query or auth object
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token || typeof token !== 'string') {
    logger.warn('Socket authentication failed: No token provided');
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwtService.verifyToken(token);

    if (!decoded || !decoded.userId) {
      logger.warn('Socket authentication failed: Invalid token');
      return next(new Error('Authentication error: Invalid token'));
    }

    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      logger.warn(`Socket authentication failed: User with ID ${decoded.userId} not found`);
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user information to the socket object
    (socket as AuthenticatedSocket).userId = user.id;
    (socket as AuthenticatedSocket).username = user.username;
    logger.debug(`Socket authenticated for user: ${user.username} (${user.id})`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication error: Token verification failed'));
  }
};
```