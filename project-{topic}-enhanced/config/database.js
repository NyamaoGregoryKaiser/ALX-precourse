```javascript
require('dotenv').config();
const config = require('./config');

const dbConfig = {
  development: {
    username: config.db.user,
    password: config.db.pass,
    database: config.db.name,
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: (msg) => config.env === 'development' && require('../utils/logger').debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    username: config.db.user,
    password: config.db.pass,
    database: config.db.testName, // Use a separate database for tests
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: false, // Disable logging for tests
    pool: {
      max: 2,
      min: 0,
      acquire: 10000,
      idle: 5000,
    },
  },
  production: {
    username: config.db.user,
    password: config.db.pass,
    database: config.db.name,
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: false, // Disable verbose logging in production
    dialectOptions: {
      ssl: {
        require: true, // If using SSL/TLS for production DB
        rejectUnauthorized: false, // Set to true if you have a valid CA certificate
      },
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
  },
};

module.exports = dbConfig;
```