```javascript
const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required().description('PostgreSQL database URL'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_EXPIRES_IN: Joi.string().default('7d').description('JWT expiry time'),
    JWT_COOKIE_EXPIRES_IN: Joi.number().default(7).description('JWT cookie expiry in days'),
    REDIS_URL: Joi.string().required().description('Redis connection URL'),
    REDIS_CACHE_TTL_SECONDS: Joi.number().default(3600).description('Redis cache TTL in seconds'),
    ADMIN_EMAIL: Joi.string().email().description('Admin user email for seeding'),
    ADMIN_PASSWORD: Joi.string().min(8).description('Admin user password for seeding'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  db: {
    url: envVars.DATABASE_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    cookieExpiresIn: envVars.JWT_COOKIE_EXPIRES_IN,
  },
  redis: {
    url: envVars.REDIS_URL,
    cacheTTLSeconds: envVars.REDIS_CACHE_TTL_SECONDS,
  },
  admin: {
    email: envVars.ADMIN_EMAIL,
    password: envVars.ADMIN_PASSWORD,
  },
};
```