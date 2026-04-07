const Sequelize = require('sequelize');
const dbConfig = require('../config/db.config');
const config = require('../config/config');
const logger = require('../config/logger.config');

const env = config.env;
const currentConfig = dbConfig[env];

const sequelize = new Sequelize(
  currentConfig.database,
  currentConfig.username,
  currentConfig.password,
  {
    host: currentConfig.host,
    port: currentConfig.port,
    dialect: currentConfig.dialect,
    logging: currentConfig.logging ? (msg) => logger.debug(msg) : false,
    dialectOptions: currentConfig.dialectOptions || {},
    pool: currentConfig.pool || undefined,
  },
);

module.exports = sequelize;