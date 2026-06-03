```typescript
import 'dotenv/config'; // Ensure dotenv is loaded first
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { AppError, HttpCode } from './utils/app-error';
import { globalErrorHandler } from './middleware/error-handler.middleware';
import { logger } from './utils/logger';
import apiRoutes from './modules'; // All API routes
import { requestLogger } from './middleware/request-logger.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';

const app: Application = express();

// Security Middleware
app.use(helmet());

// CORS Middleware
app.use(cors({
  origin: env.NODE_ENV === 'production' ? env.CLIENT_ORIGIN : '*', // Configure as needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging (using Morgan for HTTP requests, Winston for app logs)
app.use(morgan('dev', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
}));
app.use(requestLogger); // Custom request logger for more detail if needed

// Rate Limiting
app.use(apiRateLimiter);

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(HttpCode.OK).json({ status: 'UP', timestamp: new Date() });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Catch-all for undefined routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, HttpCode.NOT_FOUND));
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

export default app;
```

#### Configuration & Utilities