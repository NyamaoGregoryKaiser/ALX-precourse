module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "**/tests/**/*.test.ts"
  ],
  moduleNameMapper: {
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@repositories/(.*)$": "<rootDir>/src/repositories/$1",
    "^@middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@routes/(.*)$": "<rootDir>/src/routes/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@validation/(.*)$": "<rootDir>/src/validation/$1"
  },
  setupFilesAfterEnv: ["./tests/setup.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts", // Entry point, not much logic to test directly
    "!src/app.ts",    // App setup, covered by integration tests
    "!src/routes/**/*.ts", // Routes are tested via integration
    "!src/config/*.ts", // Config files don't need unit tests
    "!src/types/*.d.ts", // Type declarations
    "!prisma/seed.ts", // Seed data is for setup, not core logic
    "!src/utils/cache.util.ts" // For simplicity, in-memory cache not fully tested,
                               // real Redis client would have external tests.
  ],
  coverageReporters: ["json-summary", "text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
};