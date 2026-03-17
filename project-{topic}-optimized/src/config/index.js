const dotenv = require('dotenv');
dotenv.config(); // Ensure environment variables are loaded

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey',
  jwtExpiration: process.env.JWT_EXPIRATION || '1d',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'payment_processor_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '', // Optional Redis password
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15', 10) * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // Max 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  // Add more configurations as needed (e.g., external service credentials, payment gateway keys)
  paymentGateway: {
    apiKey: process.env.PAYMENT_GATEWAY_API_KEY || 'sk_test_YOUR_PAYMENT_KEY',
    // ... other gateway specifics
  }
};