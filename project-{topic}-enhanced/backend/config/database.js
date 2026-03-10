```javascript
const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg), // Log queries in debug mode
  dialectOptions: {
    ssl: config.env === 'production' ? {
      require: true,
      rejectUnauthorized: false // Adjust based on your SSL certificate setup
    } : false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
```