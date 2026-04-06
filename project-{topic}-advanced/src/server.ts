```typescript
import 'dotenv/config'; // Load environment variables first
import app from './app';
import { PORT } from './config';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Access API at http://localhost:${PORT}/api/v1`);
      logger.info(`Access Frontend at http://localhost:3000`); // Assuming frontend runs on 3000
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: Closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: Closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});
```