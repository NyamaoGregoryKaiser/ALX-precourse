const config = require('./config');

module.exports = {
  development: {
    username: config.db.username,
    password: config.db.password,
    database: config.db.database,
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: false, // Set to true to see SQL queries in development
  },
  test: {
    username: config.db.username,
    password: config.db.password,
    database: config.db.testDatabase, // Use a separate test database
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: false,
  },
  production: {
    username: config.db.username,
    password: config.db.password,
    database: config.db.database,
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: false,
    dialectOptions: {
      // ssl: {
      //   require: true,
      //   rejectUnauthorized: false, // For self-signed certs in development/testing
      // },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};