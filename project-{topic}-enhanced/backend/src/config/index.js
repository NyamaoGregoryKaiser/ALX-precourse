```javascript
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  appName: process.env.APP_NAME || 'PaymentProcessor',

  db: {
    client: process.env.DB_CLIENT,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    testName: process.env.TEST_DB_NAME || 'payment_test_db', // For Jest
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expirationTime: process.env.JWT_EXPIRATION_TIME,
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_PASSWORD || null,
  },

  mockGateway: {
    apiKey: process.env.MOCK_GATEWAY_API_KEY,
    url: process.env.MOCK_GATEWAY_URL || 'http://localhost:5001/mock-gateway',
  },

  webhook: {
    secret: process.env.WEBHOOK_SECRET,
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate essential configurations
const requiredConfig = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME', 'MOCK_GATEWAY_API_KEY'];
for (const key of requiredConfig) {
  if (!process.env[key]) {
    console.warn(`WARNING: Missing essential environment variable: ${key}`);
    // In a real production app, you might want to throw an error and exit here.
    // process.exit(1);
  }
}


module.exports = config;
```