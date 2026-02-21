const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
    PORT: Joi.number().default(5000),
    DATABASE_URL: Joi.string().required().description('PostgreSQL database URL'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_EXPIRES_IN: Joi.string().default('1d').description('JWT expiry time'),
    REDIS_HOST: Joi.string().default('localhost').description('Redis host'),
    REDIS_PORT: Joi.number().default(6379).description('Redis port'),
    RATE_LIMIT_WINDOW_MS: Joi.number().default(60000).description('Rate limit window in milliseconds'),
    RATE_LIMIT_MAX: Joi.number().default(100).description('Max requests per window'),
    CACHE_TTL_SECONDS: Joi.number().default(3600).description('Cache Time-To-Live in seconds'),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose', 'silly').default('info'),
    FRONTEND_URL: Joi.string().default('http://localhost:3000').description('Frontend URL for CORS')
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  database: {
    url: envVars.DATABASE_URL,
    dialect: 'postgres',
    logging: envVars.NODE_ENV === 'development' ? console.log : false,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX,
  },
  cache: {
    ttlSeconds: envVars.CACHE_TTL_SECONDS,
  },
  logLevel: envVars.LOG_LEVEL,
  frontendUrl: envVars.FRONTEND_URL,
};