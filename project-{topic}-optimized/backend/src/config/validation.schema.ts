import * as Joi from 'joi';

/**
 * Joi schema for validating environment variables.
 * This ensures that all required environment variables are present and
 * have the correct format before the application starts.
 * It enhances application robustness and helps catch configuration errors early.
 */
export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  FRONTEND_URL: Joi.string().uri().required(),

  // Database
  DATABASE_TYPE: Joi.string().valid('postgres', 'mysql', 'sqlite').required(),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().required(),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(), // Recommend a strong, long secret
  JWT_EXPIRATION_TIME: Joi.string().required(),

  // Redis Cache
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_TTL: Joi.number().integer().min(1).default(3600),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),
});