```typescript
import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import xss from 'xss-clean';
import morgan from 'morgan';

import globalErrorHandler from './middleware/errorHandler';
import { NotFoundError } from './utils/appErrors';
import logger from './utils/logger';
import { apiRateLimiter } from './middleware/rateLimitMiddleware';

// Import all routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import productRoutes from './modules/products/product.routes';
import categoryRoutes from './modules/categories/category.routes';
import cartRoutes from './modules/carts/cart.routes';
import orderRoutes from './modules/orders/order.routes';

// Load environment variables
dotenv.config();

const app: Application = express();

// Security Middlewares
app.use(express.json()); // Body parser for JSON
app.use(cors()); // Enable CORS for all routes
app.use(helmet()); // Set security headers
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(xss()); // Sanitize user input to prevent XSS attacks
app.use(apiRateLimiter); // Apply rate limiting to all requests

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Detailed logging in development
} else {
  // Custom tiny morgan format for production logging with Winston
  app.use(morgan('tiny', { stream: { write: (message) => logger.info(message.trim()) } }));
}


// --- Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/carts', cartRoutes);
app.use('/api/v1/orders', orderRoutes);

// Root route for API status check
app.get('/api/v1', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the E-commerce API v1.0!',
    status: 'success',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Handle undefined routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

export default app;
```