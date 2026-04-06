```typescript
// Centralized configuration management
interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  REDIS_URL?: string; // For caching/rate limiting
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value || defaultValue!;
};

export const ENV: EnvConfig = {
  PORT: parseInt(getEnvVar('PORT', '5000'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL, // Optional
};

// Export individual values for easier access
export const { PORT, NODE_ENV, DATABASE_URL, REDIS_URL } = ENV;
```