```typescript
/// <reference types="react-scripts" />

// Extend process.env to include custom environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_API_BASE_URL: string;
  }
}
```