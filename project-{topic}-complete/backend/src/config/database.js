require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('./logger');

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    // You might need this for production databases like Heroku's if SSL is required
    // ssl: {
    //   require: true,
    //   rejectUnauthorized: false // Adjust based on your SSL certificate setup
    // }
  }
});

module.exports = sequelize;