import { setupTestDB, clearTestDB, closeTestDB } from './setup-test-db';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import config from '../src/config';
import { initCache } from '../src/config/cache'; // Import initCache
import { getCacheManager } from '../src/config/cache'; // Import getCacheManager

const exec = promisify(execCallback);

// Apply migrations before all tests
beforeAll(async () => {
  await setupTestDB();

  // Run migrations programmatically
  try {
    const { stdout, stderr } = await exec(`npm run typeorm migration:run -d src/config/data-source.ts -- --host ${config.db.host} --port ${config.db.port} --username ${config.db.username} --password ${config.db.password} --database ${config.db.database}`, { cwd: './backend' });
    console.log('Migrations output:', stdout);
    if (stderr) console.error('Migrations error:', stderr);
  } catch (error: any) {
    console.error('Migration failed:', error.stdout || error.message);
    process.exit(1);
  }

  // Initialize cache for tests (Redis or Memory)
  await initCache();
});

// Clear data and cache after each test
afterEach(async () => {
  await clearTestDB();
  const cache = getCacheManager();
  if (cache.store.name === 'redis') {
    await (cache.store as any).client.flushdb(); // Clear Redis cache
  } else {
    await cache.reset(); // Clear memory cache
  }
});

// Close database connection after all tests
afterAll(async () => {
  await closeTestDB();
  const cache = getCacheManager();
  if (cache.store.name === 'redis' && (cache.store as any).client) {
    await (cache.store as any).client.quit(); // Quit Redis connection
  }
});
```

**`backend/tests/integration/auth.test.ts`** (Example Integration Test)
```typescript