import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/jest.setup.ts'],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/",
    "/src/database/migrations/",
    "/src/database/seed.ts",
    "/src/server.ts", // main entry point
    "/src/app.ts",    // app setup
    "/src/config/"    // config files
  ],
  coverageReporters: ["json", "lcov", "text", "clover"],
  verbose: true,
};

export default config;
```