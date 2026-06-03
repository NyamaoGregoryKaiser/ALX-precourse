```javascript
require('dotenv').config({ path: '../.env' }); // Load .env from root or specific backend .env

const config = {
  client: process.env.DB_CLIENT || 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'paymentuser',
    password: process.env.DB_PASSWORD || 'paymentpassword',
    database: process.env.DB_NAME || 'payment_db',
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
  pool: {
    min: 2,
    max: 10
  },
};

module.exports = {
  development: { ...config },
  staging: { ...config },
  production: {
    ...config,
    // Add production-specific configurations like SSL, higher pool limits etc.
  },
  test: {
    ...config,
    connection: {
      ...config.connection,
      database: process.env.TEST_DB_NAME || 'payment_test_db', // Separate DB for tests
    },
    pool: {
      min: 1,
      max: 1 // Keep pool small for testing
    }
  }
};
```