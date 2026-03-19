```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    USERNAME: process.env.DB_USERNAME || 'ecommerce_user',
    PASSWORD: process.env.DB_PASSWORD || 'ecommerce_password',
    NAME: process.env.DB_DATABASE || 'ecommerce_db',
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbeverylongandrandominproduction',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  },
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
    PASSWORD: process.env.ADMIN_PASSWORD || 'adminpassword123',
  }
  // Add other configurations like Cloudinary, Stripe keys, etc.
};
```