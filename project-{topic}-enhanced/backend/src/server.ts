```typescript
import 'reflect-metadata'; // Required for TypeORM
import { AppDataSource } from './database/data-source';
import app from './app';
import { env } from './config';
import { logger } from './shared/utils/logger';
import { initializeRedis } from './shared/utils/redis-client';
import { startMonitoringScheduler } from './modules/monitoring/monitoring.service';

const PORT = env.SERVER_PORT;

async function bootstrap() {
    try {
        // Initialize Database Connection
        await AppDataSource.initialize();
        logger.info('Database connected successfully!');

        // Initialize Redis Client
        await initializeRedis();
        logger.info('Redis client initialized successfully!');

        // Start the monitoring scheduler (simulated)
        startMonitoringScheduler();
        logger.info('Monitoring scheduler started.');

        // Start Express Server
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Access it at http://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to connect to database or start server:', error);
        process.exit(1); // Exit process with failure
    }
}

bootstrap();
```