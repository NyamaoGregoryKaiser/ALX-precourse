import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.preprocess(Number, z.number().positive().default(5000)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  RATE_LIMIT_WINDOW_MS: z.preprocess(Number, z.number().positive().default(15 * 60 * 1000)), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.preprocess(Number, z.number().positive().default(100)), // max 100 requests per window
  CACHE_TTL_SECONDS: z.preprocess(Number, z.number().positive().default(3600)) // 1 hour
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  logger.info('Environment variables loaded and validated successfully.');
} catch (error) {
  logger.error('Invalid environment variables:');
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      logger.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1); // Exit if environment variables are invalid
}

export const config = env;