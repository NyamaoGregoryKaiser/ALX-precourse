```typescript
import { Request, Response, NextFunction } from 'express';
import client, { Gauge, Counter, Histogram } from 'prom-client';

// Register default metrics
client.collectDefaultMetrics({ prefix: 'node_app_' });

// Define custom metrics
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationHistogram = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5, 10],
});

export const activeUsersGauge = new Gauge({
  name: 'active_users',
  help: 'Number of currently active users',
});

export const monitorChecksTotal = new Counter({
  name: 'monitor_checks_total',
  help: 'Total number of external monitor checks performed',
  labelNames: ['monitor_id', 'status'],
});

export const monitorCheckDurationHistogram = new Histogram({
  name: 'monitor_check_duration_seconds',
  help: 'Duration of external monitor checks in seconds',
  labelNames: ['monitor_id', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

// Middleware to collect HTTP request metrics
export const prometheusMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1_000_000_000; // Convert nanoseconds to seconds

    // Use a generic route or req.route.path for cleaner metrics if routes are dynamic
    // Or consider using a middleware like `express-routemap` to get actual route paths
    const route = req.baseUrl + req.path; // Simple approach, might need refinement
    const method = req.method;
    const statusCode = res.statusCode.toString();

    httpRequestCounter.labels(method, route, statusCode).inc();
    httpRequestDurationHistogram.labels(method, route, statusCode).observe(durationSeconds);
  });

  next();
};

export const collectDefaultMetrics = () => {
  client.collectDefaultMetrics(); // Already called globally, but good to have explicit call
};
```