```javascript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import httpStatus from 'http-status';
import { Server as SocketIOServer } from 'socket.io'; // Import for type hinting
import config from './config/index.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter.js';
import { errorConverter, errorHandler } from './middleware/error.js';
import ApiError from './utils/ApiError.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import logger from './config/logger.js';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import registerSocketHandlers from './websocket/handlers.js';

const app = express();
const prisma = new PrismaClient();

// set security HTTP headers
app.use(helmet());

// enable cors
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
}));
app.options('*', cors()); // Enable pre-flight for all routes

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// apply rate limiting for API routes
app.use('/api', apiRateLimiter);

// specific rate limiting for auth routes
app.use('/api/auth', authRateLimiter);

// v1 api routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);


// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

/**
 * Attaches Socket.IO to the HTTP server and registers handlers.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server} The Socket.IO server instance.
 */
export const setupSocketIO = (httpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.clientOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allows for larger payload sizes (e.g., if we were sending images)
    maxHttpBufferSize: 1e8, // 100 MB
  });

  // WebSocket Authentication Middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required for WebSocket'));
    }
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, email: true },
      });

      if (!user) {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'User not found or token invalid'));
      }
      // Attach user object to the socket for use in handlers
      socket.user = user;
      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error.message);
      if (error instanceof jwt.TokenExpiredError) {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
      } else if (error instanceof jwt.JsonWebTokenError) {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
      }
      next(new ApiError(httpStatus.UNAUTHORIZED, 'WebSocket authentication failed'));
    }
  });

  // Register all event handlers
  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket, socket.user);
  });

  return io;
};

export default app;
```