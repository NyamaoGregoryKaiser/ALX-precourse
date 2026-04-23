import 'reflect-metadata'; // Must be imported before typeorm
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { config } from './config';
import logger from './utils/logger';
import { globalErrorHandler } from './middlewares/errorHandler';
import { apiRateLimiter } from './middlewares/rateLimitMiddleware';

// Import Routes
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: config.env === 'development' ? '*' : 'https://yourfrontend.com' }));

// Request logging (using morgan for HTTP requests)
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate Limiting for all API requests (except auth)
app.use('/api', apiRateLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
// app.use('/api/merchants', merchantRoutes); // TODO: Add Merchant CRUD routes

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  next(new Error(`Can't find ${req.originalUrl} on this server!`, { cause: 404 }));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

export default app;