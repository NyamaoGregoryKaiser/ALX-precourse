const config = require('./config');

module.exports = {
  development: {
    username: config.sequelize.username,
    password: config.sequelize.password,
    database: config.sequelize.database,
    host: config.sequelize.host,
    port: config.sequelize.port,
    dialect: config.sequelize.dialect,
  },
  test: {
    username: config.sequelize.username,
    password: config.sequelize.password,
    database: `${config.sequelize.database}_test`, // Use a separate test database
    host: config.sequelize.host,
    port: config.sequelize.port,
    dialect: config.sequelize.dialect,
    logging: false, // Disable logging for tests
  },
  production: {
    username: config.sequelize.username,
    password: config.sequelize.password,
    database: config.sequelize.database,
    host: config.sequelize.host,
    port: config.sequelize.port,
    dialect: config.sequelize.dialect,
    logging: false,
  },
};