```typescript
import { DataSource } from "typeorm";
import { User } from "./src/entities/User";
import { Project } from "./src/entities/Project";
import { ScrapingTask } from "./src/entities/ScrapingTask";
import { ScrapingResult } from "./src/entities/ScrapingResult";
import { InitialSchema1678888888888 } from "./src/database/migrations/1678888888888-InitialSchema";
import { environment } from "./src/config/environment";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: environment.dbHost,
  port: environment.dbPort,
  username: environment.dbUser,
  password: environment.dbPassword,
  database: environment.dbName,
  synchronize: false, // Never use synchronize in production! Use migrations.
  logging: environment.nodeEnv === 'development',
  entities: [User, Project, ScrapingTask, ScrapingResult],
  migrations: [InitialSchema1678888888888],
  subscribers: [],
  ssl: environment.dbSsl, // Use SSL in production if required by your DB provider
});
```