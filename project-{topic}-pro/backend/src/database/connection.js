const knex = require('knex');
const knexfile = require('../../knexfile');
const config = require('../config');
const logger = require('../utils/logger');

const environment = config.env;
const db = knex(knexfile[environment]);

db.raw('SELECT 1')
  .then(() => {
    logger.info(`Database connected successfully to ${config.databaseUrl}`);
  })
  .catch((err) => {
    logger.error('Failed to connect to database:', err);
    process.exit(1); // Exit process if DB connection fails
  });

module.exports = db;