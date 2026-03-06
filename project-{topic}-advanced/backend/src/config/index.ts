```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_EXPIRATION_MINUTES || '30', 10),
    refreshExpirationDays: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS || '7', 10),
    resetPasswordExpirationMinutes: parseInt(process.env.JWT_RESET_PASSWORD_EXPIRATION_MINUTES || '10', 10),
    verifyEmailExpirationMinutes: parseInt(process.env.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES || '10', 10),
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // Use 'true' or 'false' in .env
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM || 'support@authsystem.com',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
  }
};
```