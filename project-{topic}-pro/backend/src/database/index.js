```javascript
const knex = require('knex');
const config = require('../config');
const knexConfig = require('../../knexfile');
const logger = require('../utils/logger');

// Select the appropriate configuration based on the environment
const environment = config.env;
const dbConfig = knexConfig[environment];

const db = knex(dbConfig);

// Test database connection
db.raw('SELECT 1+1 AS result')
  .then(() => {
    logger.info(`Database connection to ${config.db.name} (${config.env}) successful.`);
  })
  .catch((err) => {
    logger.error(`Database connection failed: ${err.message}`);
    // Optionally exit the process if DB connection is critical
    // process.exit(1);
  });

module.exports = db;
```