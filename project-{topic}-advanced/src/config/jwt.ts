```typescript
import { ENV } from './index';

// JWT Configuration
export const JWT_SECRET = ENV.NODE_ENV === 'production'
  ? process.env.JWT_SECRET || 'supersecretjwtkeythatmustbechangedinproduction' // Use strong secret in production
  : 'dev_secret_key'; // Easier for development

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // e.g., '1h', '7d'
```