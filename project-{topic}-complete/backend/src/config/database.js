require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../middleware/logger');

const {
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DB_HOST,
    DB_PORT,
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
        // Example for production with SSL
        // ssl: {
        //     require: true,
        //     rejectUnauthorized: false // Adjust for self-signed certs
        // }
    }
});

module.exports = {
    sequelize,
};