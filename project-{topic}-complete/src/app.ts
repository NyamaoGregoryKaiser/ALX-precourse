import 'reflect-metadata'; // Must be imported before TypeORM
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import apiV1Routes from './api/v1/routes';
import swaggerSpec from './config/swagger';
import { CORS_ORIGINS, NODE_ENV } from './config';
import logger from './utils/logger';

// Create Express app
const app = express();

// Security Middleware: Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// CORS Middleware: Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: CORS_ORIGINS, // Specific origins allowed
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body Parser Middleware: Parses incoming request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate Limiting Middleware: Apply to all requests to prevent abuse
app.use(apiRateLimiter);

// Logger Middleware (optional, for request logging)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`Request: ${req.method} ${req.originalUrl}`);
    next();
  });
}

// API Routes
app.use('/api/v1', apiV1Routes);

// Swagger Documentation Setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'Mobile App Backend API Docs',
  swaggerOptions: {
    persistAuthorization: true, // Keep authorization token across sessions
  }
}));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Service is healthy' });
});

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Global Error Handler Middleware (must be the last middleware)
app.use(errorHandler);

export default app;