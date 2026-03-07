```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/logging.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import dataSourceRoutes from './routes/dataSource.routes';
import datasetRoutes from './routes/dataset.routes';
import visualizationRoutes from './routes/visualization.routes';
import dashboardRoutes from './routes/dashboard.routes';
import logger from './config/logger';

const app = express();

// Security Middleware
app.use(helmet());

// CORS - Allow cross-origin requests
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Restrict to specific frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Request logger
app.use(requestLogger);

// Rate Limiting
app.use(apiRateLimiter);

// Body parser
app.use(express.json());

// Basic route for health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/data-sources', dataSourceRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/visualizations', visualizationRoutes);
app.use('/api/dashboards', dashboardRoutes);

// 404 Not Found Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
```