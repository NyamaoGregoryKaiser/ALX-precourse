import prisma from '../src/utils/prisma.js';
import { redisClient } from '../src/middleware/cache.js';
import logger from '../src/utils/logger.js';

// This script runs once after all tests have finished.
export default async () => {
  if (prisma) {
    logger.info('Global Teardown: Disconnecting Prisma client...');
    await prisma.$disconnect();
    logger.info('Global Teardown: Prisma client disconnected.');
  }

  if (redisClient && redisClient.isReady) {
    logger.info('Global Teardown: Disconnecting Redis client...');
    await redisClient.disconnect();
    logger.info('Global Teardown: Redis client disconnected.');
  }
};
```

```yaml