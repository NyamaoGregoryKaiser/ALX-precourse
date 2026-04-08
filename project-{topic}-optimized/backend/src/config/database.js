require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./logger');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

// Define models (to be imported after sequelize init)
const User = require('../models/User')(sequelize, Sequelize);
const Product = require('../models/Product')(sequelize, Sequelize);

// Set up associations
User.hasMany(Product, { foreignKey: 'userId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'userId', as: 'User' });

module.exports = sequelize;
```