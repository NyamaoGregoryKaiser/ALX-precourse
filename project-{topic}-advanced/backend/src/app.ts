```typescript
import 'express-async-errors'; // Enables automatic catching of async errors
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { register, httpRequestDurationSeconds, httpRequestsTotal } from './utils/prometheus';
import { CORS_ORIGIN, __prod__ } from './config/env';
import logger from './utils/logger';

// Import Routes
import authRoutes from './routes/auth.routes';
import serviceRoutes from './routes/service.routes';
import metricDefinitionRoutes from './routes/metricDefinition.routes';
import dataPointRoutes from './routes/dataPoint.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Prometheus Metrics Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
    httpRequestsTotal.labels(req.method, req.route?.path || req.path, res.statusCode).inc();
  });
  next();
});

// Prometheus metrics endpoint (unauthenticated)
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});


// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/services/:serviceId/metrics', metricDefinitionRoutes); // Nested route
app.use('/api/v1/data-points', dataPointRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Root route (for health check or simple info)
app.get('/', apiRateLimiter, (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the Performance Monitoring System API!',
    environment: __prod__ ? 'production' : 'development',
    version: '1.0.0',
  });
});

// Catch-all for undefined routes
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
```