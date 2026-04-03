```typescript
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { ScrapingJob } from '../scraping/entities/scraping-job.entity';
import { ScrapingResult } from '../scraping/entities/scraping-result.entity';
import { ScrapingTask } from '../scraping/entities/scraping-task.entity';

dotenv.config({ path: './.env' }); // Load .env file

export const dataSourceOptions: DataSourceOptions = {
  type: (process.env.DATABASE_TYPE as any) || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'scrapemaster_db',
  entities: [User, ScrapingJob, ScrapingResult, ScrapingTask],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  // `synchronize: true` is for development only. Use migrations for production.
  synchronize: false,
  logging: ['query', 'error'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
```