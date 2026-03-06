```javascript
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_EXPIRATION_MINUTES, 10),
    refreshExpirationDays: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS, 10),
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_PASSWORD || null,
  },
  clientOrigin: process.env.CLIENT_ORIGIN,
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate essential configurations
if (!config.jwt.secret) {
  throw new Error('JWT_SECRET environment variable is not defined.');
}
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

export default config;
```