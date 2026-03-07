```typescript
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'], // Load .env for tests
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts', // Entry point, less critical for unit/integration coverage
    '!src/app.ts',    // App setup
    '!src/database/index.ts', // DB init
    '!src/database/migrations/**',
    '!src/database/seed/**',
    '!src/interfaces/**',
    '!src/config/**',
    '!src/utils/validation.utils.ts', // Joi schemas are not typically "tested" by Jest
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
  forceExit: true,
  detectOpenHandles: true,
};

export default config;
```