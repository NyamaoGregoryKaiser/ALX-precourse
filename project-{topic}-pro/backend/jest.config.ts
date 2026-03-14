import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'], // Global setup file for tests
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/src'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts",
    "!src/app.ts",
    "!src/config/*.ts",
    "!src/migrations/*.ts",
    "!src/seeders/*.ts",
    "!src/**/*.d.ts",
    "!src/utils/logger.ts" // Logger usually mocked or handled separately
  ],
  coverageReporters: ["json", "lcov", "text", "clover", "cobertura"],
  globalSetup: '<rootDir>/src/test-global-setup.ts',
  globalTeardown: '<rootDir>/src/test-global-teardown.ts',
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ]
};

export default config;