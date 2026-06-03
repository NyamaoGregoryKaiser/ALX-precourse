```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.ts'], // Global setup for tests
  testMatch: [
    '**/tests/**/*.test.ts',
  ],
  moduleNameMapper: {
    // Alias for TypeScript paths
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts', // Exclude server startup file
    '!src/app.ts', // Exclude app setup file
    '!src/modules/index.ts', // Exclude route aggregation file
    '!src/database/prisma-client.ts', // Handled by mocking or integration tests
    '!src/config/env.ts', // Environment config, tested implicitly
    '!src/utils/logger.ts', // Logger utility, tested implicitly
    '!src/utils/redis-client.ts', // Redis client, tested implicitly/integration
    '!src/**/*.routes.ts', // Routes are covered by e2e tests
    '!src/**/*.validation.ts', // Validation schemas, tested implicitly by middleware
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  verbose: true,
  forceExit: true, // Ensure Jest exits after all tests are done
  detectOpenHandles: true, // Helps identify open resources
  maxWorkers: '50%', // Reduce resource usage in CI
  testTimeout: 30000, // Increase timeout for tests that might involve DB operations
};

export default config;
```

**Test Setup File**