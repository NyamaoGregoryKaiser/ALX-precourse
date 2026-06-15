```typescript
import { registerAs } from '@nestjs/config';

/**
 * Defines the application configuration, specifically the port.
 * Uses `registerAs` to create a configuration namespace.
 */
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
}));
```