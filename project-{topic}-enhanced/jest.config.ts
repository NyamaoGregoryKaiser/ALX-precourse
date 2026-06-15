```typescript
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(service|controller|module).ts',
    '!main.ts',
    '!app.module.ts',
    '!auth/constants.ts',
    '!auth/strategy/jwt.strategy.ts',
    '!auth/guards/jwt-auth.guard.ts',
    '!common/',
    '!database/',
    '!config/',
    '!dto/',
    '!entities/',
    '!enum/',
  ],
  coverageDirectory: '../coverage/unit-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ["<rootDir>/../test/setup-unit.ts"]
};

export default config;
```