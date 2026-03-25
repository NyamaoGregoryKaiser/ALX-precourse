import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/config/', // Configuration files
    '/src/server.ts', // Entry point
    '/src/app.ts', // Express app setup (covered by integration tests)
    '/src/database/migrations/', // Migrations are schema changes, not logic to unit test
    '/src/database/seeds/', // Seeds are data, not logic
    '/src/routes/', // Routes are wiring, covered by integration tests
    '/src/types/', // Type definitions
    '/src/utils/catchAsync.ts', // Simple utility, covered implicitly
  ],
  collectCoverageFrom: ['src/**/*.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  moduleNameMapper: {
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@database/(.*)$": "<rootDir>/src/database/$1",
    "^@middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^@routes/(.*)$": "<rootDir>/src/routes/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1"
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: "tsconfig.json"
    }]
  },
  // Ensure that tests don't hang due to open handles
  forceExit: true,
  // If you want to gracefully close connections after tests
  globalTeardown: '<rootDir>/tests/jest.teardown.ts',
};

export default config;