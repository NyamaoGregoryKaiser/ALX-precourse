import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Roots where tests are located
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  // Files to ignore when looking for tests
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  // Transform settings for TypeScript
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts', // Entry point, not much logic to test directly
    '!src/app.ts',    // App setup, mostly integration
    '!src/config/*.ts', // Configuration files
    '!src/database/data-source.ts', // Database initialization
    '!src/database/migrations/*.ts', // Migrations are for schema evolution, not logic
    '!src/database/seeders/*.ts', // Seeders are for data population
    '!src/types/*.d.ts', // Type declarations
    '!src/api/v1/routes/*.ts', // Routes are wiring, covered by API tests
    '!src/utils/logger.ts', // Logging utility
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // To resolve modules from baseUrl in tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // For integration tests, we might want to ensure a clean database
  globalSetup: '<rootDir>/tests/jest.global-setup.ts',
  globalTeardown: '<rootDir>/tests/jest.global-teardown.ts',
};

export default config;