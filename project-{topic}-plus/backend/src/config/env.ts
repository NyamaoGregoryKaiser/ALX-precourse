import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file based on NODE_ENV
// In development, it loads from .env in the current directory.
// For testing, it should ideally load from a separate .env.test or be mocked.
// For Docker, variables are typically passed directly.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Define schema for environment variables using Zod
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  TEST_DATABASE_URL: z.string().url('TEST_DATABASE_URL must be a valid URL'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'),

  SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10), // bcrypt salt rounds

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100), // 100 requests
  RATE_LIMIT_GUEST_MAX_REQUESTS: z.coerce.number().int().min(1).default(20), // 20 requests

  CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(300), // 5 minutes
});

// Validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

// Export the validated environment variables
export const env = parsedEnv.data;
```