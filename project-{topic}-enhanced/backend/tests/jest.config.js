module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/../src', '<rootDir>'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/../src/config/$1',
    '^@entities/(.*)$': '<rootDir>/../src/entities/$1',
    '^@repositories/(.*)$': '<rootDir>/../src/repositories/$1',
    '^@services/(.*)$': '<rootDir>/../src/services/$1',
    '^@controllers/(.*)$': '<rootDir>/../src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/../src/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/../src/utils/$1',
    '^@validation/(.*)$': '<rootDir>/../src/validation/$1',
    '^@subscribers/(.*)$': '<rootDir>/../src/subscribers/$1',
    '^@types/(.*)$': '<rootDir>/../src/types/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/setup-test-env.ts'], // Global setup/teardown
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/app.ts",
    "!src/server.ts",
    "!src/routes/**/*.ts",
    "!src/config/data-source.ts",
    "!src/migrations/**/*.ts",
    "!src/seeds/**/*.ts",
    "!src/subscribers/**/*.ts", // Optional if subscriber logic is simple logging
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};
```

**`backend/tests/setup-test-env.ts`**
```typescript