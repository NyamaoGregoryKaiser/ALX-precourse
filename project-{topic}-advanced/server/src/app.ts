import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { requestLogger } from './middleware/logger.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dataSourceRoutes from './routes/dataSource.routes';
import dashboardRoutes from './routes/dashboard.routes';
import chartRoutes from './routes/chart.routes';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from '../docs/api.json'; // Will be generated or manually created

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Performance Middlewares
app.use(compression());
app.use(rateLimiter); // Apply rate limiting to all requests

// Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Request Logger
app.use(requestLogger);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/data-sources', dataSourceRoutes);
app.use('/api/v1/dashboards', dashboardRoutes);
app.use('/api/v1/charts', chartRoutes);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Centralized Error Handling
app.use(errorHandler);

export default app;