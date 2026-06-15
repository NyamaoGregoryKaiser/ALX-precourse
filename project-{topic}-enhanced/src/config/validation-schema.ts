```typescript
import * as Joi from 'joi';

/**
 * Joi schema for validating environment variables.
 * Ensures all required variables are present and have the correct type/format.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false), // Should be false in production
  DATABASE_LOGGING: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('3600s'),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_TTL: Joi.number().default(3600), // Cache TTL in seconds

  THROTTLER_TTL: Joi.number().default(60), // Rate limiting TTL in seconds
  THROTTLER_LIMIT: Joi.number().default(10), // Rate limiting request limit
});
```