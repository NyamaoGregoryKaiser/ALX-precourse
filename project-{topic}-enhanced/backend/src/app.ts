```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler, handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import config from './config';
import logger from './utils/logger';

// Import routes
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import chatRoutes from './chats/chat.routes';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Gzip compression
app.use(compression());

// HTTP request logger
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Apply rate limiting to all API requests
// app.use(apiRateLimiter); // Apply globally, or specifically on routes as done in route files

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);

// Catch-all for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: 'Not Found',
  });
});

// Global error handler
app.use(errorHandler);

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

export default app;
```