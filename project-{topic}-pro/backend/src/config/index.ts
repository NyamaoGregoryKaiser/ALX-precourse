import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'anothersecretkey',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  hashSaltRounds: parseInt(process.env.HASH_SALT_ROUNDS || '10', 10),
  paymentGatewayUrl: process.env.PAYMENT_GATEWAY_URL || 'https://mock-payment-gateway.com/api',
  webhookSecret: process.env.WEBHOOK_SECRET || 'webhooksecretkey',
  maxPaymentAmount: parseFloat(process.env.MAX_PAYMENT_AMOUNT || '100000'), // Max amount in USD for example
};