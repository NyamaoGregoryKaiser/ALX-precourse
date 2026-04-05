```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { env } from './config';
import { errorHandler } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';
import { prometheusMiddleware } from './utils/prometheus.utils';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import monitorRoutes from './routes/monitor.routes';
import metricRoutes from './routes/metric.routes';
import alertRoutes from './routes/alert.routes';

export const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({ origin: env.CORS_ORIGIN }));

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging Middleware
app.use(loggingMiddleware);

// Rate Limiting
app.use(apiLimiter);

// Prometheus Metrics Middleware
app.use(prometheusMiddleware);

// API Routes
app.use(`/api/${env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${env.API_VERSION}/users`, userRoutes);
app.use(`/api/${env.API_VERSION}/projects`, projectRoutes);
app.use(`/api/${env.API_VERSION}/monitors`, monitorRoutes);
app.use(`/api/${env.API_VERSION}/metrics`, metricRoutes); // Metrics are typically nested under monitors
app.use(`/api/${env.API_VERSION}/alerts`, alertRoutes); // Alerts can be globally managed or monitor-specific

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Prometheus Metrics Endpoint
// This should be publicly accessible for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.end(await require('prom-client').register.metrics());
});

// Global Error Handling Middleware
app.use(errorHandler);

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found', path: req.originalUrl });
});
```