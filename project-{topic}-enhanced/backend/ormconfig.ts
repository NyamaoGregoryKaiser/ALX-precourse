```typescript
// This file is used by the TypeORM CLI to locate the DataSource.
// It uses `ts-node` to run the TypeScript file directly.
import 'reflect-metadata';
import { AppDataSource } from './src/database/typeorm.config';

export default AppDataSource;
```