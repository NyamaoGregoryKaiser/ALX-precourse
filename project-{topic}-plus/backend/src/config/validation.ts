```typescript
import * as Joi from 'joi';

export const validate = (config: Record<string, any>) => {
  const schema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test', 'provision')
      .default('development'),
    PORT: Joi.number().default(3000),

    // JWT
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('1d'),

    // Database
    DATABASE_TYPE: Joi.string().valid('postgres').default('postgres'),
    DATABASE_HOST: Joi.string().required(),
    DATABASE_PORT: Joi.number().required(),
    DATABASE_USERNAME: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_NAME: Joi.string().required(),

    // Redis
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),

    // Throttling
    THROTTLE_TTL: Joi.number().default(60),
    THROTTLE_LIMIT: Joi.number().default(100),

    // Frontend URL for CORS
    FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),

    // Puppeteer executable path (for Docker/CI environments)
    PUPPETEER_EXECUTABLE_PATH: Joi.string().optional(),
  });

  const { error, value } = schema.validate(config, { abortEarly: false, allowUnknown: true });

  if (error) {
    throw new Error(`Validation failed - Invalid environment variables: ${error.message}`);
  }

  return value;
};
```