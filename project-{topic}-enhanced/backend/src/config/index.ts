```typescript
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/chat_app?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // max 100 requests per windowMs
};

export default config;
```