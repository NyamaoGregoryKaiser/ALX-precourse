const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'UNIT',
  testMatch: ["**/tests/unit/**/*.test.ts"],
  coverageDirectory: "coverage/unit",
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "src/utils/**/*.ts",
    "src/validation/**/*.ts",
    "!src/utils/cache.util.ts" // Exclude cache for specific reasons
  ],
};