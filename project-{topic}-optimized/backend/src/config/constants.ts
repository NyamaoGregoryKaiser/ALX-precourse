```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envPath = path.resolve(__dirname, '../../.env'); // Adjust path as needed
dotenv.config({ path: envPath });

export const NODE_ENV: string = process.env.NODE_ENV || 'development';
export const API_PORT: number = parseInt(process.env.API_PORT || '3000', 10);
export const API_PREFIX: string = process.env.API_PREFIX || '/api/v1';
export const CLIENT_URL: string = process.env.CLIENT_URL || 'http://localhost:3001';

export const DB_HOST: string = process.env.DB_HOST || 'localhost';
export const DB_PORT: number = parseInt(process.env.DB_PORT || '5432', 10);
export const DB_USERNAME: string = process.env.DB_USERNAME || 'paymentuser';
export const DB_PASSWORD: string = process.env.DB_PASSWORD || 'paymentpassword';
export const DB_NAME: string = process.env.DB_NAME || 'paymentdb';

export const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback_jwt_secret_please_change_in_production';
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1h';

export const REDIS_HOST: string = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT: number = parseInt(process.env.REDIS_PORT || '6379', 10);

export const LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';
```