import 'dotenv/config'; // Load environment variables first
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.config';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { logger } from './utils/logger.util';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true })); // Configure CORS for frontend
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded data

// Request Logging Middleware
app.use(requestLogger);

// Rate Limiting Middleware
app.use(rateLimiter);

// API Routes
app.get(`${config.apiVersion}/health`, (req, res) => {
  res.status(200).json({ message: 'Service operational', uptime: process.uptime() });
});
setupRoutes(app);

// Global Error Handler Middleware
app.use(errorHandler);

export default app;