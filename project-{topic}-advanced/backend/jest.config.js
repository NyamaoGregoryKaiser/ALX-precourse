```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1', // For absolute imports if used
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts', // Exclude entry point
    '!src/app.ts',   // Exclude app setup (mostly middleware/routes)
    '!src/types.d.ts', // Exclude type definitions
    '!src/migrations/**', // Exclude migrations
    '!src/config/**', # Exclude config files
    '!src/data-source.ts', # Exclude data-source setup
    '!src/utils/prometheus.ts', # Metrics definition, not logic
    '!src/**/dtos/*.ts', # Exclude DTOs
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```