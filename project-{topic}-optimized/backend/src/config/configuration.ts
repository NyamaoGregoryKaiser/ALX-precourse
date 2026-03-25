/**
 * Defines a custom configuration loader function.
 * This function is used by the NestJS ConfigModule to load application configuration
 * from environment variables or default values.
 *
 * It provides a structured way to access configuration, preventing direct `process.env` access
 * throughout the application, which improves testability and maintainability.
 *
 * @returns {object} An object containing all application configuration.
 */
export const configuration = () => ({
  // Application settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  API_PREFIX: process.env.API_PREFIX || 'api/v1',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database settings
  DATABASE_TYPE: process.env.DATABASE_TYPE || 'postgres',
  DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
  DATABASE_PORT: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  DATABASE_USERNAME: process.env.DATABASE_USERNAME || 'admin',
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || 'password',
  DATABASE_NAME: process.env.DATABASE_NAME || 'task_management',

  // JWT (Authentication) settings
  JWT_SECRET: process.env.JWT_SECRET || 'aVeryStrongJwtSecretKeyIndeed',
  JWT_EXPIRATION_TIME: process.env.JWT_EXPIRATION_TIME || '3600s', // 1 hour

  // Redis (Caching) settings
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_TTL: parseInt(process.env.REDIS_TTL, 10) || 3600, // 1 hour in seconds

  // Throttler (Rate Limiting) settings
  THROTTLE_TTL: parseInt(process.env.THROTTLE_TTL, 10) || 60, // 1 minute
  THROTTLE_LIMIT: parseInt(process.env.THROTTLE_LIMIT, 10) || 100, // 100 requests per minute
});

// Augment the NodeJS.ProcessEnv interface to include custom environment variables
// This provides TypeScript type safety when accessing environment variables via process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      PORT?: string;
      API_PREFIX?: string;
      FRONTEND_URL?: string;
      DATABASE_TYPE?: string;
      DATABASE_HOST?: string;
      DATABASE_PORT?: string;
      DATABASE_USERNAME?: string;
      DATABASE_PASSWORD?: string;
      DATABASE_NAME?: string;
      JWT_SECRET?: string;
      JWT_EXPIRATION_TIME?: string;
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_TTL?: string;
      THROTTLE_TTL?: string;
      THROTTLE_LIMIT?: string;
    }
  }
}