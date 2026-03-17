```typescript
import 'reflect-metadata'; // Required for TypeORM
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import scrapingTaskRoutes from './routes/scrapingTask.routes';
import scrapingResultRoutes from './routes/scrapingResult.routes';
import { AppError } from './utils/AppError';
import { logger } from './utils/logger';

/**
 * @file Express application setup.
 *
 * This module configures and exports the main Express application.
 * It includes middleware for security, logging, rate limiting,
 * routes, and a centralized error handler.
 */

export const createApp = (): Application => {
  const app = express();

  // Security Middleware
  app.use(helmet()); // Sets various HTTP headers for security
  app.use(cors());   // Enables CORS for all origins (configure for specific origins in production)

  // Body Parser
  app.use(express.json()); // Parses incoming JSON requests
  app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies

  // Request Logger
  app.use(requestLogger);

  // Rate Limiting (apply to all API requests)
  app.use('/api', apiRateLimiter);

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', scrapingTaskRoutes);
  app.use('/api/results', scrapingResultRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', message: 'Service is up and running' });
  });

  // Handle undefined routes (404)
  app.all('*', (req, res, next) => {
    logger.warn(`Attempted to access non-existent route: ${req.originalUrl}`);
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });

  // Global Error Handling Middleware
  app.use(errorHandler);

  return app;
};
```