```typescript
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration object for the application.
 * Reads values from environment variables.
 * Provides default values where appropriate.
 */
export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydatabase',
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey_default', // **IMPORTANT: Change this in production**
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  cacheTtl: parseInt(process.env.CACHE_TTL || '3600', 10), // Default 1 hour in seconds
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // Default 1 minute
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // Default 100 requests
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate critical configurations
if (!config.jwtSecret || config.jwtSecret === 'supersecretjwtkey_default') {
  console.warn('WARNING: JWT_SECRET is not set or using default. This is insecure in production.');
}
if (!config.databaseUrl) {
  console.error('CRITICAL: DATABASE_URL is not set.');
  process.exit(1); // Exit if no database connection string
}

console.log(`Application running in ${config.nodeEnv} mode.`);
```