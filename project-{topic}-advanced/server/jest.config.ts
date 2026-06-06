import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/app.ts',
    '!src/routes/*.ts',
    '!src/config/*.ts',
    '!src/database/migrations/*.ts',
    '!src/database/seed/*.ts',
    '!src/types/*.ts',
    '!src/utils/appError.ts', // Simple class, less critical for coverage metrics
    '!src/middleware/logger.middleware.ts', // Logging config
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  verbose: true,
  forceExit: true, // Forces Jest to exit after all tests run, important for DB connections
};

export default config;