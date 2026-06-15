```typescript
/**
 * This file would typically contain your JWT secret, but it's loaded from
 * environment variables in a real production application for security.
 *
 * It's kept here as a constant file for illustrative purposes if you were to
 * hardcode it (NOT RECOMMENDED for production).
 *
 * In this project, `JWT_SECRET` is loaded from `process.env.JWT_SECRET`
 * via `@nestjs/config`.
 */
export const jwtConstants = {
  // DO NOT expose your secret key publicly. Use environment variables.
  // This is a placeholder.
  secret: 'superSecretKeyForDev',
  // You can also define expiresIn here, but it's also better in .env
  expiresIn: '3600s', // 1 hour
};
```