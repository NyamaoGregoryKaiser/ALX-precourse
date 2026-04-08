require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
// For sequelize-cli to work, we need to load the correct .env based on NODE_ENV

const {
  DB_DIALECT,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

module.exports = {
  development: {
    dialect: DB_DIALECT || 'postgres',
    host: DB_HOST || 'localhost',
    port: DB_PORT || 5432,
    username: DB_USER || 'devuser',
    password: DB_PASSWORD || 'devpassword',
    database: DB_NAME || 'api_dev_db',
    logging: false, // Set to console.log for SQL queries
  },
  test: {
    dialect: DB_DIALECT || 'postgres',
    host: DB_HOST || 'localhost',
    port: DB_PORT || 5432,
    username: DB_USER || 'testuser',
    password: DB_PASSWORD || 'testpassword',
    database: DB_NAME || 'api_test_db',
    logging: false, // Disable logging for tests
  },
  production: {
    dialect: DB_DIALECT || 'postgres',
    host: DB_HOST, // Must be provided in production env
    port: DB_PORT || 5432,
    username: DB_USER, // Must be provided in production env
    password: DB_PASSWORD, // Must be provided in production env
    database: DB_NAME, // Must be provided in production env
    logging: false, // Disable verbose logging in production
    dialectOptions: {
      ssl: {
        require: process.env.DB_SSL_REQUIRE === 'true', // e.g., for Heroku Postgres
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true', // self-signed certs
      },
    },
  },
};
```