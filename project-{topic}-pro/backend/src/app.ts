```typescript
import 'reflect-metadata'; // Required for TypeORM
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import logger from '@config/logger';
import { config } from '@config/index';
import { apiRateLimiter } from '@middleware/rateLimit.middleware';
import errorHandler from '@middleware/error.middleware';
import AppError, { ErrorType } from '@utils/AppError';

// Import Routes
import authRoutes from '@routes/auth.routes';
import userRoutes from '@routes/user.routes';
import projectRoutes from '@routes/project.routes';
import taskRoutes from '@routes/task.routes';

const app = express();

// Security Middleware
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
  origin: config.NODE_ENV === 'development' ? '*' : 'http://localhost:3000', // Adjust for production frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate Limiting (apply to all requests, specific endpoints can override)
app.use(apiRateLimiter);

// Routes
app.get('/health', (req, res) => res.status(200).send('API is healthy!'));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, ErrorType.NOT_FOUND));
});

// Global error handling middleware
app.use(errorHandler);

export default app;
```