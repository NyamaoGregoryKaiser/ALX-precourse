import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Helper function to get environment variable with a default value
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable "${key}" is not set.`);
  }
  return value || defaultValue!;
};

// Application configuration
export const NODE_ENV = getEnv('NODE_ENV', 'development');
export const PORT = parseInt(getEnv('PORT', '3000'), 10);
export const LOG_LEVEL = getEnv('LOG_LEVEL', 'info');

// Database configuration
export const DB_TYPE = getEnv('DB_TYPE', 'postgres');
export const DB_HOST = getEnv('DB_HOST', 'localhost');
export const DB_PORT = parseInt(getEnv('DB_PORT', '5432'), 10);
export const DB_USERNAME = getEnv('DB_USERNAME', 'user');
export const DB_PASSWORD = getEnv('DB_PASSWORD', 'password');
export const DB_DATABASE = getEnv('DB_DATABASE', 'mobile_backend_db');

// JWT configuration
export const JWT_SECRET = getEnv('JWT_SECRET');
export const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN', '1h'); // e.g., '1h', '7d'

// Redis configuration
export const REDIS_URL = getEnv('REDIS_URL', 'redis://localhost:6379');
export const CACHE_TTL_SECONDS = parseInt(getEnv('CACHE_TTL_SECONDS', '3600'), 10); // Default 1 hour

// Rate Limiting configuration
export const RATE_LIMIT_WINDOW_MS = parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10); // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = parseInt(getEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10); // 100 requests per window

// CORS origins
export const CORS_ORIGINS = getEnv('CORS_ORIGINS', 'http://localhost:8080').split(',');