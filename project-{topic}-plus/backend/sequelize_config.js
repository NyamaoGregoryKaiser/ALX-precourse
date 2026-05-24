```javascript
// This file is used by the sequelize-cli directly.
// It should export a configuration object for each environment.
// It uses environment variables, so ensure they are set when running CLI commands.
// For Docker, these are typically sourced from the .env file.
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'cmsuser',
    password: process.env.DB_PASSWORD || 'cmspassword',
    database: process.env.DB_NAME || 'cms_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: console.log,
  },
  test: {
    username: process.env.DB_USER || 'cmsuser',
    password: process.env.DB_PASSWORD || 'cmspassword',
    database: `${process.env.DB_NAME || 'cms_db'}_test`, // Separate test database
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false, // No logging during tests
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: process.env.DB_DIALECT,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  },
};
```