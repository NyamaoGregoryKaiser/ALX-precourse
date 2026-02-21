// This file is specifically for sequelize-cli configuration
// and is separate from the application's config/config.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: true,
  },
  test: {
    url: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/ml_utilities_test_db',
    dialect: 'postgres',
    logging: false, // Keep test logs clean
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Adjust as needed for your production SSL cert
      },
    },
  },
};

module.exports = config;