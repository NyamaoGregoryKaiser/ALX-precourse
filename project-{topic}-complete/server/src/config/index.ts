import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  redisUrl: string;
  cacheTtlUsers: number;
  cacheTtlProjects: number;
  cacheTtlTasks: number;
  clientUrl: string;
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/taskdb?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cacheTtlUsers: parseInt(process.env.CACHE_TTL_USERS || '300', 10), // 5 minutes
  cacheTtlProjects: parseInt(process.env.CACHE_TTL_PROJECTS || '60', 10), // 1 minute
  cacheTtlTasks: parseInt(process.env.CACHE_TTL_TASKS || '30', 10), // 30 seconds
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

// Validate essential configurations
if (!config.jwtSecret) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}
if (!config.databaseUrl) {
  throw new Error('FATAL ERROR: DATABASE_URL is not defined.');
}

export default config;