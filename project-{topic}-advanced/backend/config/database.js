const { Sequelize } = require('sequelize');
const logger = require('../src/utils/logger');

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config.json')[env];

let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: (msg) => logger.debug(msg), // Log Sequelize queries using our logger
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' && {
        require: true,
        rejectUnauthorized: false // For self-signed certs in some cloud providers, adjust as needed
      }
    }
  });
}

module.exports = sequelize;