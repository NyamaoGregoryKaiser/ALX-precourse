require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // seconds
  },
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS === 'true',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },
  queue: {
    name: 'scraperQueue',
    concurrency: 5, // Number of jobs to process concurrently
  }
};

// Validate essential configurations
if (!config.databaseUrl) {
  console.error('FATAL ERROR: DATABASE_URL is not defined.');
  process.exit(1);
}
if (!config.redisUrl) {
  console.error('FATAL ERROR: REDIS_URL is not defined.');
  process.exit(1);
}
if (!config.jwtSecret) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

module.exports = config;