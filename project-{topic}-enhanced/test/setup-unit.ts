```typescript
/**
 * Global setup for unit and integration tests.
 * This runs once before all non-E2E tests.
 * This file is referenced in `jest.config.ts` `setupFilesAfterEnv`.
 */
beforeAll(async () => {
  // Any global setup for unit/integration tests can go here.
  // For example, mocking global services or setting up environment variables
  // that are common across many tests but not directly mocked in each.
});

// Example: Mock console methods to reduce noise during tests
const mockedConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Optionally, if you want to completely suppress console logs
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});
// jest.spyOn(console, 'debug').mockImplementation(() => {});
// jest.spyOn(console, 'info').mockImplementation(() => {});
```