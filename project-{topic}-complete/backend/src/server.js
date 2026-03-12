require('dotenv').config(); // Load environment variables
const app = require('./app');
const { sequelize } = require('./config/database');
const logger = require('./middleware/logger');

const PORT = process.env.PORT || 5000;

// Test database connection and start server
const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Database connection has been established successfully.');

        // Optionally synchronize models (for development, migrations preferred for production)
        // await sequelize.sync({ alter: true }); // Use { force: true } carefully!
        // logger.info('Database models synchronized.');

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(`Unable to connect to the database or start server: ${error.message}`);
        process.exit(1); // Exit with failure code
    }
};

startServer();