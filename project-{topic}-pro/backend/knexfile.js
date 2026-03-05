require('dotenv').config({ path: '../.env' }); // Load .env from root or specific path

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/database/migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
    pool: {
      min: 2,
      max: 10,
    },
    debug: false,
  },

  test: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/scraper_test_db', // Use a separate test database
    migrations: {
      directory: './src/database/migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
    pool: {
      min: 1,
      max: 2,
    },
    debug: false,
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/database/migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
    pool: {
      min: 2,
      max: 10,
    },
    debug: false, // Set to true for debugging in production if needed, but generally false
  },
};