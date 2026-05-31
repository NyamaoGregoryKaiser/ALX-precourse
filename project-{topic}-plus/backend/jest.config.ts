import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  // Coverage reporting
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts', // Exclude main server bootstrap file
    '!src/app.ts',    // Exclude express app setup (mostly middleware and routes)
    '!src/index.ts',  // Exclude main entry point
    '!src/config/*.ts', // Exclude config files
    '!src/types/*.d.ts', // Exclude type definition files
    '!src/modules/*/index.ts', // Exclude module aggregation files
    '!src/middleware/validationMiddleware.ts' // Validation is tested via API tests implicitly
  ],
  coverageThreshold: {
    global: {
      branches: 50, // Aim for 50% for this example
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // Detect open handles helps in ensuring all database connections are closed
  detectOpenHandles: true,
  forceExit: true, // Force Jest to exit after tests, especially useful with open handles
};

export default config;
```