const knex = require('knex');
const { Model } = require('objection');
const config = require('../config');
const logger = require('./logger');

// Initialize Knex
const knexInstance = knex(config.db);

// Bind all Objection.js models to the Knex instance
Model.knex(knexInstance);

// Optional: Test the database connection
knexInstance.raw('SELECT 1+1 AS result')
  .then(() => {
    logger.info('Database connected successfully.');
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1); // Exit process if DB connection fails
  });

module.exports = {
  knex: knexInstance,
  Model, // Export Model for Objection.js models to extend
};