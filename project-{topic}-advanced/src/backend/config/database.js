```javascript
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Load environment variables from .env file
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT,
        logging: (msg) => logger.debug(msg), // Use Winston for logging Sequelize queries
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

module.exports = sequelize;
```