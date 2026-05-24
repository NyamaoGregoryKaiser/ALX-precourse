import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config({ path: './.env' });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required().description('PostgreSQL database URL'),
    TEST_DATABASE_URL: Joi.string().description('PostgreSQL test database URL'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7).description('days after which refresh tokens expire'),
    REDIS_URL: Joi.string().required().description('Redis connection URL'),
  })
  .unknown(); // Allow unknown variables

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  database: {
    url: envVars.NODE_ENV === 'test' ? envVars.TEST_DATABASE_URL : envVars.DATABASE_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
  },
  redis: {
    url: envVars.REDIS_URL,
  },
};

export default config;
```

```javascript