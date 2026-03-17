```javascript
module.exports = {
  testEnvironment: 'node',
  // Files that are run once before all test suites. Used for setting up DB or mocks.
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup.js"
  ],
  // Patterns to match test files
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.js",
    "<rootDir>/tests/integration/**/*.test.js",
    "<rootDir>/tests/api/**/*.test.js"
  ],
  // Paths to ignore for code coverage calculation
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/config/",           // Configuration files often don't need tests
    "/src/database/migrations/", // Migrations are for schema evolution, not logic
    "/src/database/seeders/", // Seeders are data setup, not logic
    "/src/server.js",         // Entry point, mostly setup
    "/src/app.js",            // Express app setup, covered by integration tests
    "/src/routes/",           // Routes are wiring, covered by API/integration tests
    "/src/utils/redisClient.js" // Redis client might be mocked, and connection logic is simple
  ],
  // Collect coverage from specific files
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/tests/**" // Exclude test files from coverage
  ],
  // Specify minimum coverage thresholds (e.g., 80% lines, statements, functions, branches)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Optionally, enforce coverage for all files even if they don't have tests
  // collectCoverage: true, // This is usually set in the npm script
  // Detects open handles (e.g., database connections, server instances) after tests
  // and attempts to gracefully close them. Important for clean test runs.
  detectOpenHandles: true,
  // Force Jest to exit after all tests are complete, even if open handles remain.
  // Use with caution, but often necessary for integration/API tests that spawn servers/DB.
  forceExit: true,
  // Transformation for ES Modules syntax if needed (e.g., for 'import' statements)
  transform: {
    "^.+\\.js$": "babel-jest"
  }
};
```