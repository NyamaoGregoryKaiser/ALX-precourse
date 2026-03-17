```typescript
import dotenv from 'dotenv';
dotenv.config();

/**
 * @file Manages environment variable configuration for the application.
 *
 * This module loads environment variables from a `.env` file and provides
 * them in a structured object, ensuring that essential variables are
 * present and typed correctly.
 */

interface Environment {
  nodeEnv: string;
  port: number;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbSsl: boolean;
  jwtSecret: string;
  jwtAccessTokenExpiration: string;
  jwtRefreshTokenExpiration: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  cacheTtlSeconds: number;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value;
};

export const environment: Environment = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: parseInt(getEnvVar('PORT', '3000'), 10),
  dbHost: getEnvVar('DB_HOST', 'localhost'),
  dbPort: parseInt(getEnvVar('DB_PORT', '5432'), 10),
  dbUser: getEnvVar('DB_USER', 'postgres'),
  dbPassword: getEnvVar('DB_PASSWORD', 'password'),
  dbName: getEnvVar('DB_NAME', 'scraping_db'),
  dbSsl: getEnvVar('DB_SSL', 'false').toLowerCase() === 'true',
  jwtSecret: getEnvVar('JWT_SECRET', 'supersecretjwtkey'),
  jwtAccessTokenExpiration: getEnvVar('JWT_ACCESS_TOKEN_EXPIRATION', '1h'),
  jwtRefreshTokenExpiration: getEnvVar('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
  rateLimitWindowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '60000'), 10), // 1 minute
  rateLimitMaxRequests: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'), 10), // 100 requests
  cacheTtlSeconds: parseInt(getEnvVar('CACHE_TTL_SECONDS', '3600'), 10), // 1 hour
};

// Log environment variables (sensitive data masked)
console.log('Environment Loaded:');
Object.entries(environment).forEach(([key, value]) => {
  if (key.includes('password') || key.includes('secret')) {
    console.log(`- ${key}: **********`);
  } else {
    console.log(`- ${key}: ${value}`);
  }
});
```