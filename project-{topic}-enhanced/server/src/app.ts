import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { errorHandler } from '@/middlewares/error.middleware';
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/users/user.routes';
import productRoutes from '@/modules/products/product.routes';
import roleRoutes from '@/modules/roles/role.routes';
import { rateLimiter } from '@/middlewares/rateLimit.middleware';
import logger from '@/utils/logger';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Request Body Parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate Limiting
app.use(rateLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/roles', roleRoutes);

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Catch-all for undefined routes
app.use((req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Not Found' });
});

// Centralized Error Handling
app.use(errorHandler);

export default app;