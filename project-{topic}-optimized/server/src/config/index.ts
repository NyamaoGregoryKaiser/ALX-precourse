import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  env: string;
  database: {
    type: 'postgres';
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean; // Only for development/testing, NEVER true in production
    logging: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cache: {
    ttl: number; // Time-To-Live in seconds
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  uploadDir: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'mlutilshub_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'mlutilshub_db',
    synchronize: process.env.NODE_ENV === 'development' ? false : false, // Disable synchronize for production-readiness
    logging: process.env.NODE_ENV === 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey_please_change_this_in_production!',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // Default 1 hour
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests
  },
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
};

export default config;
```