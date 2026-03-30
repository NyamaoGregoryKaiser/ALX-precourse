import { AppDataSource } from '../src/db/data-source';
import { LoggerService } from '../src/utils/logger';
import { RedisService } from '../src/services/cache';

const logger = LoggerService.getLogger();

module.exports = async () => {
    logger.info("Tearing down test environment...");
    if (AppDataSource.isInitialized) {
        // Clear all data from test database (optional, good practice for CI/CD)
        const entities = AppDataSource.entityMetadatas;
        for (const entity of entities) {
            const repository = AppDataSource.getRepository(entity.name);
            await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
        }
        await AppDataSource.destroy();
        logger.info("Data Source destroyed.");
    }
    await RedisService.getClient().disconnect();
    logger.info("Redis client disconnected.");
    logger.info("Test environment teardown complete.");
};