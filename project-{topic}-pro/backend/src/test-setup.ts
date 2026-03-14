// Optional: If you need to mock specific modules or set up per-test state
// For example, clearing Redis cache before each test
import { redisClient } from './config/redis';

beforeEach(async () => {
  // Clear redis cache before each test to ensure isolation
  if (redisClient.isReady) {
    await redisClient.flushdb();
  }
});

afterAll(async () => {
  if (redisClient.isReady) {
    await redisClient.quit(); // Ensure redis client is closed
  }
});