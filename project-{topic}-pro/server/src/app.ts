import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { jwtStrategy } from './auth/jwt.strategy';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { authRoutes } from './auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { conversationRoutes } from './modules/conversations/conversation.routes';
import { messageRoutes } from './modules/messages/message.routes';
import { setupSocketIO } from './sockets';
import { config } from './config';
import { CustomError } from './utils/error';

export const createApp = (): { app: Application; server: http.Server; io: SocketIOServer } => {
  const app: Application = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Initialize Passport.js
  app.use(passport.initialize());
  passport.use('jwt', jwtStrategy);

  // Security Middleware
  app.use(helmet());
  app.use(cors({
    origin: config.clientUrl,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Custom Logger Middleware
  app.use(loggerMiddleware);

  // Rate Limiting
  app.use(apiRateLimiter);

  // Routes
  app.get('/', (req: Request, res: Response) => {
    res.send('Chat API is running!');
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/messages', messageRoutes);

  // Socket.IO setup
  setupSocketIO(io);

  // Catch 404 and forward to error handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new CustomError(`Cannot find ${req.originalUrl} on this server!`, 404));
  });

  // Error handling middleware
  app.use(errorMiddleware);

  return { app, server, io };
};