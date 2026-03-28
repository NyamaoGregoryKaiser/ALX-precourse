const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'INTEGRATION',
  testMatch: ["**/tests/integration/**/*.test.ts"],
  coverageDirectory: "coverage/integration",
  collectCoverageFrom: [
    "src/controllers/**/*.ts",
    "src/routes/**/*.ts",
    "src/middleware/**/*.ts",
    "src/app.ts",
    "!src/middleware/logger.middleware.ts", // Logging middleware doesn't need test coverage itself
    "!src/middleware/rateLimit.middleware.ts", // Rate limit tested by behavior, not internal logic
  ],
};