```javascript
const { Sequelize, DataTypes } = require('sequelize');
const { sequelizeConfig } = require('../config/config');
const logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const config = sequelizeConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
  dialectOptions: config.dialectOptions, // For SSL in production
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Import models
db.User = require('./user')(sequelize, DataTypes);
db.Category = require('./category')(sequelize, DataTypes);
db.Post = require('./post')(sequelize, DataTypes);

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Authenticate and synchronize database
async function connectToDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Connection to the database has been established successfully.');
    // In production, migrations should be run before starting the app.
    // In development, you might use `sync({ alter: true })` or `sync({ force: true })`
    // to automatically apply schema changes, but migrations are preferred for production.
    // await sequelize.sync({ alter: true }); // Use carefully, can lead to data loss
    // logger.info('Database synchronized.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1); // Exit process if database connection fails
  }
}

connectToDatabase();

module.exports = db;
```