module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "<rootDir>/src/backend/__tests__/**/*.test.ts"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/backend/$1"
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ["<rootDir>/src/backend/__tests__/setup.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/backend/server.ts", // Server entry point
    "/src/backend/app.ts",    // App setup
    "/src/backend/database/data-source.ts", // DB config
    "/src/backend/database/migrations/", // Migrations are not unit-testable code
    "/src/backend/config/", // Config files
    "/src/backend/utils/logger.ts", // Logger utility
    "/src/backend/middleware/", // Middlewares are mostly tested via API tests
    "/src/backend/routes/", // Routes are tested via API tests
    "/src/backend/types/", // Type definitions
    "/src/frontend/" // Frontend has its own testing setup
  ],
  coverageReporters: ["json", "lcov", "text", "clover"],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  detectOpenHandles: true, // Helps identify open handles preventing Jest from exiting
  forceExit: true // Force exit Jest after tests are done
};