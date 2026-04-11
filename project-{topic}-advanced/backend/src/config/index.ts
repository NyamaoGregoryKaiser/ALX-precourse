```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpirationTime: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  nodeEnv: string;
  frontendUrl: string; // Add frontend URL for CORS
}

const getConfig = (): Config => {
  return {
    port: parseInt(process.env.PORT || '5000', 10),
    databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ecommerce_db?schema=public',
    jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey',
    jwtExpirationTime: process.env.JWT_EXPIRATION_TIME || '1h',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
    redisPassword: process.env.REDIS_PASSWORD,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000', // Default frontend URL
  };
};

export const config = getConfig();
```