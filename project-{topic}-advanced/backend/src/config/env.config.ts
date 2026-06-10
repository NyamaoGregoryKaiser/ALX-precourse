```typescript
import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('1h'),
  JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Admin Seed
  ADMIN_USERNAME: Joi.string().default('admin'),
  ADMIN_EMAIL: Joi.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: Joi.string().default('adminpassword'),

}).unknown(true); // Allow unknown variables in .env

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment variable validation error: ${error.message}`);
}

export const env = {
  NODE_ENV: envVars.NODE_ENV as 'development' | 'production' | 'test',
  PORT: envVars.PORT as number,
  DB_HOST: envVars.DB_HOST as string,
  DB_PORT: envVars.DB_PORT as number,
  DB_USERNAME: envVars.DB_USERNAME as string,
  DB_PASSWORD: envVars.DB_PASSWORD as string,
  DB_DATABASE: envVars.DB_DATABASE as string,
  JWT_SECRET: envVars.JWT_SECRET as string,
  JWT_ACCESS_TOKEN_EXPIRATION: envVars.JWT_ACCESS_TOKEN_EXPIRATION as string,
  JWT_REFRESH_TOKEN_EXPIRATION: envVars.JWT_REFRESH_TOKEN_EXPIRATION as string,
  REDIS_HOST: envVars.REDIS_HOST as string,
  REDIS_PORT: envVars.REDIS_PORT as number,
  REDIS_PASSWORD: envVars.REDIS_PASSWORD as string,
  RATE_LIMIT_WINDOW_MS: envVars.RATE_LIMIT_WINDOW_MS as number,
  RATE_LIMIT_MAX_REQUESTS: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  ADMIN_USERNAME: envVars.ADMIN_USERNAME as string,
  ADMIN_EMAIL: envVars.ADMIN_EMAIL as string,
  ADMIN_PASSWORD: envVars.ADMIN_PASSWORD as string,
};
```