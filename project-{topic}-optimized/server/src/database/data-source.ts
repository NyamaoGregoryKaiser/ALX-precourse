import { DataSource } from 'typeorm';
import config from '../config';
import { User } from '../modules/auth/entities/User';
import { Dataset } from '../modules/datasets/entities/Dataset';
import { MLModel } from '../modules/models/entities/MLModel';
import { ExperimentRun } from '../modules/experiments/entities/ExperimentRun';
import path from 'path';

export const AppDataSource = new DataSource({
  type: config.database.type,
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize, // Should be false in production
  logging: config.database.logging,
  entities: [User, Dataset, MLModel, ExperimentRun],
  migrations: [path.join(__dirname, '/migrations/**/*.ts')],
  subscribers: [],
  extra: {
    // Add connection pool settings for better performance in production
    max: 10, // maximum number of clients in the pool
    min: 2,  // minimum number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  },
});
```