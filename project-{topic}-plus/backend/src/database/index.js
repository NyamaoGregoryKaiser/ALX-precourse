```javascript
const { Sequelize } = require('sequelize');
const config = require(__dirname + '/../config/database.js')[process.env.NODE_ENV || 'development'];
const logger = require('../utils/logger');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
  dialectOptions: config.dialectOptions || {},
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

// Load models
db.User = require('./models/User')(sequelize, Sequelize);
db.Product = require('./models/Product')(sequelize, Sequelize);

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Sync database (only for development/testing, migrations are preferred for production)
db.connect = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    // await sequelize.sync({ alter: true }); // Use migrations instead of `sync({ alter: true })` in production
    // logger.info('Database synchronized (models updated).');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1); // Exit process if DB connection fails
  }
};

module.exports = db;
```