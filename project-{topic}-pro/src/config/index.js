require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  db: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'payments_user',
      password: process.env.DB_PASSWORD || 'secure_password',
      database: process.env.DB_NAME || 'payment_system_db',
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './database/migrations',
    },
    seeds: {
      directory: './database/seeds',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  paymentGateway: {
    apiKey: process.env.PAYMENT_GATEWAY_API_KEY || 'mock_api_key',
    secret: process.env.PAYMENT_GATEWAY_SECRET || 'mock_secret',
    baseUrl: process.env.PAYMENT_GATEWAY_BASE_URL || 'http://localhost:5001/mock-gateway', // Mock external gateway
    mockSuccessRate: parseFloat(process.env.MOCK_PAYMENT_SUCCESS_RATE || '0.9'), // For mock gateway
    mockProcessingTime: parseInt(process.env.MOCK_PAYMENT_PROCESSING_TIME_MS || '1000', 10), // For mock gateway
  },
  // Other configurations like logging levels, feature flags, etc.
};

module.exports = config;