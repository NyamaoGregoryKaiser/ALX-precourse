```javascript
const Sequelize = require('sequelize');
const config = require('./config');
const logger = require('../src/utils/logger');
const redis = require('redis');

const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: (msg) => {
    if (config.env === 'development') {
      logger.debug(`[Sequelize] ${msg}`);
    }
  },
  define: {
    freezeTableName: true, // Prevents Sequelize from pluralizing table names
    underscored: true, // Use snake_case for column names
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const redisClient = redis.createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

module.exports = {
  sequelize,
  redisClient,
};
```