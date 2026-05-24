```javascript
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` }); // Load specific env based on NODE_ENV first
require('dotenv').config({ path: `.env`, override: true }); // Then load generic .env, overriding common variables

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiPrefix: process.env.API_PREFIX || '/api',
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_EXPIRATION_MINUTES || '30', 10),
    refreshExpirationDays: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS || '30', 10),
  },
  database: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'cmsuser',
    password: process.env.DB_PASSWORD || 'cmspassword',
    database: process.env.DB_NAME || 'cms_db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // max 100 requests per minute
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
};

// For Sequelize CLI configuration (not used by application directly, but good to keep consistent)
// The `sequelize_config.js` or `config/config.js` is typically used by `sequelize-cli`
// This structure is compatible with sequelize-cli's expected config.
const sequelizeConfig = {
  development: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: config.database.logging,
  },
  test: {
    username: config.database.username,
    password: config.database.password,
    database: `${config.database.database}_test`, // Use a separate test database
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false, // Suppress logging for tests
  },
  production: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true, // If using SSL on production database
        rejectUnauthorized: false // Adjust based on your SSL certificate setup
      }
    }
  },
};

module.exports = {
  config,
  sequelizeConfig,
};
```