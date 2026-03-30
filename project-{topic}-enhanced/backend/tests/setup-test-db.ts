import { AppDataSource } from '../src/config/data-source';
import config from '../src/config';
import { User } from '../src/entities/User';
import { Project } from '../src/entities/Project';
import { Task } from '../src/entities/Task';
import logger from '../src/config/logger';

// Override DB config for tests
config.db.database = process.env.DB_DATABASE || 'test_db';
config.db.host = process.env.DB_HOST || 'localhost';
config.db.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5433; // Use a different port for test DB
config.jwt.secret = process.env.JWT_SECRET || 'testsecret';
config.redis.host = process.env.REDIS_HOST || 'localhost';
config.redis.port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6380;


export const setupTestDB = async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  // Set up the data source with test specific configurations
  Object.assign(AppDataSource.options, {
    database: config.db.database,
    host: config.db.host,
    port: config.db.port,
    username: config.db.username,
    password: config.db.password,
    synchronize: false, // Ensure migrations are run explicitly
    logging: false, // Suppress logs during tests
    dropSchema: true, // Drop schema to ensure clean slate for each test run (or run migrations up/down)
    entities: [User, Project, Task],
    migrations: [], // Do not run migrations directly from datasource in test setup, use `migration:run`
  });

  try {
    await AppDataSource.initialize();
    logger.info(`Test DB connection initialized: ${config.db.database} on ${config.db.host}:${config.db.port}`);
  } catch (error) {
    logger.error('Failed to initialize test database:', error);
    process.exit(1);
  }
};

export const clearTestDB = async () => {
  if (AppDataSource.isInitialized) {
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
  }
};

export const closeTestDB = async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Test DB connection closed.');
  }
};
```

**`backend/tests/jest.config.js`**
```javascript