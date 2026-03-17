```javascript
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
require('dotenv').config({ path: '.env' });

module.exports = {
  development: {
    username: process.env.DB_USER || 'pguser',
    password: process.env.DB_PASSWORD || 'pgpassword',
    database: process.env.DB_NAME || 'product_management_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
  },
  test: {
    username: process.env.DB_USER || 'pguser_test',
    password: process.env.DB_PASSWORD || 'pgpassword_test',
    database: process.env.DB_NAME_TEST || 'product_management_test_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Adjust based on your production DB setup
      }
    }
  }
};
```