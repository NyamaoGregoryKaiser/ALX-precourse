require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Sync models (optional, for development, migrations are preferred for production)
    // await sequelize.sync({ alter: true });
    // logger.info('Database models synchronized.');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database or start server:', error);
    process.exit(1); // Exit with failure code
  }
}

startServer();