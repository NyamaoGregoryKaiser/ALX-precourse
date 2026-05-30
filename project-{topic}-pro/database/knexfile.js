const config = require('../src/config'); // Load the same config used by the app

module.exports = {
  development: {
    client: config.db.client,
    connection: config.db.connection,
    migrations: config.db.migrations,
    seeds: config.db.seeds,
    pool: config.db.pool,
  },
  test: {
    client: config.db.client,
    connection: {
      ...config.db.connection,
      database: `${config.db.connection.database}_test`, // Use a separate test database
    },
    migrations: config.db.migrations,
    seeds: config.db.seeds,
    pool: {
      min: 1,
      max: 1, // Single connection for tests
    },
  },
  production: {
    client: config.db.client,
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }, // Use SSL in production
    },
    migrations: config.db.migrations,
    seeds: config.db.seeds,
    pool: {
      min: 2,
      max: 10,
    },
  },
};