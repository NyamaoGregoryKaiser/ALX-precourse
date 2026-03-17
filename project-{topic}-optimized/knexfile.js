require('dotenv').config(); // Load environment variables here too for Knex CLI

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'payment_processor_db',
    },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
    debug: false,
  },
  test: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER_TEST || 'test_user',
      password: process.env.DB_PASSWORD_TEST || 'test_password',
      database: process.env.DB_NAME_TEST || 'payment_processor_test_db',
    },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_test_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
    pool: {
      min: 2,
      max: 10
    },
    debug: false,
  },
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST_PROD,
      port: process.env.DB_PORT_PROD || 5432,
      user: process.env.DB_USER_PROD,
      password: process.env.DB_PASSWORD_PROD,
      database: process.env.DB_NAME_PROD,
      ssl: { rejectUnauthorized: false }, // Adjust for production SSL
    },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
    pool: {
      min: 2,
      max: 10
    },
    debug: false,
  }
};