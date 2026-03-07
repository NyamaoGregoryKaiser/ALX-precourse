```typescript
import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/perf_monitor_db';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkey';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

export const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests per minute

export const __prod__ = process.env.NODE_ENV === 'production';
export const __test__ = process.env.NODE_ENV === 'test';

// Ensure JWT secrets are defined
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET or JWT_REFRESH_SECRET is not defined.');
  process.exit(1);
}
```