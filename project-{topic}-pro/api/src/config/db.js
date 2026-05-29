```javascript
const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./logger');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg), // Log all queries at debug level
  pool: {
    max: 10, // Maximum number of connection in pool
    min: 0, // Minimum number of connection in pool
    acquire: 30000, // The maximum time, in milliseconds, that a connection can be idle before being released
    idle: 10000, // The maximum time, in milliseconds, that pool will try to get connection before throwing error
  },
  define: {
    freezeTableName: true, // Prevent sequelize from auto-pluralizing table names
    underscored: true, // Use snake_case for column names
    timestamps: true, // Add createdAt and updatedAt columns
  },
});

/**
 * Connects to the database and synchronizes models.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    // In production, migrations should be handled by migration scripts.
    // For development/testing, you might use:
    // await sequelize.sync({ alter: true }); // Use alter: true to update existing tables without dropping data
    // logger.info('All models were synchronized successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1); // Exit process with failure code
  }
};

module.exports = { sequelize, connectDB };
```