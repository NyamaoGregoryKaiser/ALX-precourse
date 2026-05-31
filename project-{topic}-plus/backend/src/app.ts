import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { StatusCodes } from 'http-status-codes';
import { AppError } from './utils/appError';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './utils/logger';
import { authenticatedRateLimiter } from './middleware/rateLimiter';

import apiRoutes from './modules'; // Aggregated routes

const app = express();

// 1. CORS - Enable Cross-Origin Resource Sharing
app.use(cors());

// 2. Body Parser - Reads JSON data from request body
app.use(express.json({ limit: '10kb' }));

// 3. Request Logger - Logs incoming requests
app.use(requestLogger);

// 4. Rate Limiting - Apply to all authenticated routes
// For unauthenticated routes, apply specific rate limiters directly (e.g., login/register)
app.use('/api/v1', authenticatedRateLimiter);


// 5. API Routes
app.use('/api/v1', apiRoutes);

// Health check endpoint
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    status: 'success',
    message: 'API is healthy!',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 6. Handle Undefined Routes (404)
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, StatusCodes.NOT_FOUND));
});

// 7. Global Error Handling Middleware
app.use(errorHandler);

export default app;
```