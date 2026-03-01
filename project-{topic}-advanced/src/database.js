```javascript
// src/database.js
const { Sequelize } = require('sequelize');
const config = require('./config/config').database;
const logger = require('./utils/logger');
const db = require('./models'); // Import the models configured in src/models/index.js

const sequelize = db.sequelize; // Access the configured Sequelize instance

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connection to PostgreSQL has been established successfully.');
        // In a real production environment, migrations would be run via CLI
        // Here we can sync models for development convenience if needed, but not recommended for prod.
        // await sequelize.sync(); // DANGER: Don't use in production for existing DBs, use migrations.
        // logger.info('All models were synchronized successfully.');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        process.exit(1); // Exit process on database connection failure
    }
};

module.exports = {
    sequelize,
    connectDB,
};
```