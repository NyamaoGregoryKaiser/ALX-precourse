require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection and apply migrations
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Apply migrations
    // In production, migrations are often run as a separate step.
    // For simplicity in this comprehensive example, we run them on server start.
    // Consider using `npx sequelize-cli db:migrate` in CI/CD or deployment scripts.
    await sequelize.sync({ alter: true }); // 'alter: true' will modify tables to reflect model changes without dropping data.
                                         // Use `force: true` for development to drop and recreate tables.
    logger.info('Database synchronized (migrations applied or schema updated).');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database or start the server:', error);
    process.exit(1); // Exit process with failure
  }
}

startServer();