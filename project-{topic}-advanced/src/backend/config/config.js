```javascript
require('dotenv').config(); // Load environment variables

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT
  },
  test: {
    username: process.env.DB_USER, // Using same credentials for test, but a different DB_NAME
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + '_test', // Ensure your test setup creates/uses this
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false // Disable logging for tests
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // For self-signed certs or development, adjust for production
      }
    }
  }
};
```