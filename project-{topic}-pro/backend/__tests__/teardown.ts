```typescript
// __tests__/teardown.ts
import { AppDataSource } from '../src/config/data-source';
import redisClient from '../src/config/redisClient';

export default async () => {
    try {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        if (redisClient.status.includes('connect')) {
            await redisClient.disconnect();
        }
    } catch (error) {
        console.error('Error during test teardown:', error);
    }
};
```