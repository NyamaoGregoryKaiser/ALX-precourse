```typescript
import client from 'prom-client';
import logger from './logger';

// Register default metrics
client.collectDefaultMetrics({ prefix: 'node_app_' });

// Define custom metrics
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // Buckets for latency in seconds
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
});

export const databaseQueryDurationSeconds = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'entity'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

export const cacheOperationsTotal = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'], // e.g., 'get', 'set', 'hit', 'miss'
});

export const customMetricGauge = new client.Gauge({
  name: 'custom_application_gauge',
  help: 'A custom gauge metric for application-specific values',
  labelNames: ['type'],
});

export const register = client.register;

logger.info('Prometheus metrics initialized.');
```