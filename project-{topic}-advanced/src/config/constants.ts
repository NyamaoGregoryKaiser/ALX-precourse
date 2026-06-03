```typescript
export const API_PREFIX = '/api/v1';

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const CACHE_KEYS = {
  CATEGORIES_ALL: 'categories:all',
  TASK_BY_ID: (id: string) => `task:${id}`,
  USER_BY_ID: (id: string) => `user:${id}`,
};

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per 15 minutes

export const REFRESH_TOKEN_COOKIE_NAME = 'jid'; // jid = JWT ID (for refresh token)
```

#### Middleware