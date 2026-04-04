```typescript
// src/utils/constants.ts

interface AppConfig {
  API_BASE_URL: string;
  SOCKET_URL: string;
}

export const config: AppConfig = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
};
```