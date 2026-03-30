module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'], // Look for tests in src and tests folders
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/src/**/*.test.ts' // Allows tests co-located with source
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/",
    "/src/db/migrations/",
    "/src/db/seeders/",
    "/src/server.ts", // Entry point, mostly setup
    "/src/app.ts", // Express app setup, tested via routes
    "/src/config/" // Configuration files
  ],
  coverageReporters: ["json", "lcov", "text", "clover"],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'], // Setup file for global mocks/hooks
  globalTeardown: '<rootDir>/tests/teardown.ts', // Teardown for closing DB connections etc.
};