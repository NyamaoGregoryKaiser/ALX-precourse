import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.ts'],
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/integration/**/*.test.ts',
    '**/tests/api/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts', // Exclude entry point
    '!src/app.ts',    // Exclude app setup
    '!src/routes/*.ts', // Routes are primarily integration tested via controllers
    '!src/migrations/*.ts',
    '!src/config/*.ts',
    '!src/types/*.d.ts',
    '!src/utils/logger.ts', // Logging is hard to test directly
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
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

export default config;