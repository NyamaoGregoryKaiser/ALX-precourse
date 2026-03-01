```javascript
// src/config/config.js
const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

// ALX Principle: Centralized Configuration
// Manage all environment-dependent configurations in one place.
const envVarsSchema = Joi.object()
    .keys({
        NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().required().description('PostgreSQL host'),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required().description('PostgreSQL user'),
        DB_PASSWORD: Joi.string().required().description('PostgreSQL password'),
        DB_NAME: Joi.string().required().description('PostgreSQL database name'),
        JWT_SECRET: Joi.string().required().description('JWT secret key'),
        JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
        JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
        RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100).description('Maximum requests per 15 minutes window'),
        // GATEWAY_WEBHOOK_SECRET: Joi.string().description('Secret for validating incoming gateway webhooks'),
        // Add other secrets like Stripe, PayPal API keys here
    })
    .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
    env: envVars.NODE_ENV,
    server: {
        port: envVars.PORT,
    },
    database: {
        host: envVars.DB_HOST,
        port: envVars.DB_PORT,
        username: envVars.DB_USER,
        password: envVars.DB_PASSWORD,
        database: envVars.DB_NAME,
        dialect: 'postgres',
        logging: false, // Set to true to see Sequelize SQL queries
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    },
    rateLimit: {
        maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    },
    // gateway: {
    //     webhookSecret: envVars.GATEWAY_WEBHOOK_SECRET,
    // }
};
```