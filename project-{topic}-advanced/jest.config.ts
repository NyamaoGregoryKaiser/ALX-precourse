```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
  setupFilesAfterEnv: ['./tests/jest.setup.ts'], // For shared test setup
  moduleNameMapper: {
    // Allows absolute imports based on tsconfig.json baseUrl
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Collect coverage from files in src, excluding specific patterns
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts", // Entry point
    "!src/app.ts",    // Express app setup (covered by integration tests)
    "!src/routes/**/*.ts", // Route aggregation
    "!src/config/**/*.ts", // Configuration files
    "!src/utils/prisma.ts", // Prisma client setup
    "!src/utils/logger.ts", // Logger
    "!src/prisma/seed.ts",  // Seed script
    "!src/types/**/*.d.ts"  // Type declarations
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["json", "lcov", "text", "clover"],
  verbose: true,
  forceExit: true, // Exit Jest process after tests
  detectOpenHandles: true, // Detect open handles that prevent Jest from exiting
};

export default config;
```