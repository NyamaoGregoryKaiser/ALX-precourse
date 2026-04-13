module.exports = {
  testEnvironment: 'node',
  // Configure Jest to look for tests in a specific directory
  testMatch: ['<rootDir>/src/tests/**/*.test.js'],
  // Collect coverage from files in src, excluding config and test files
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Main entry point, often thin
    '!src/app.js', // Express app setup
    '!src/config/**/*.js', // Configuration files
    '!src/routes/**/*.js', // Routes are mostly just declarations
    '!src/tests/**/*.js', // Test files themselves
    '!prisma/seed.js', // Seed script
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // Setup file for global test setup/teardown
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
};