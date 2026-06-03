```javascript
const knex = require('knex');
const config = require('./index');
const logger = require('../utils/logger');

const dbConfig = require('../../knexfile'); // Use knexfile.js

const environment = config.env;
const db = knex(dbConfig[environment]);

db.raw('SELECT 1+1 AS result')
  .then(() => {
    logger.info(`Database (${environment}) connected successfully.`);
  })
  .catch((err) => {
    logger.error(`Database connection failed (${environment}):`, err.message);
    process.exit(1); // Exit process if DB connection fails
  });

module.exports = db;
```