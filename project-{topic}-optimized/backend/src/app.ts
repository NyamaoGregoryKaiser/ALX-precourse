```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { AppError } from './utils/appError';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { requestLogger } from './middlewares/logger.middleware';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import merchantRoutes from './modules/merchants/merchant.routes';
import accountRoutes from './modules/accounts/account.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import { API_PREFIX } from './config/constants';
import { rateLimiter } from './middlewares/rateLimiter.middleware';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || '*', // Restrict this in production
    credentials: true,
}));

// Request Logging
app.use(morgan('dev')); // 'dev' for development, 'combined' for production
app.use(requestLogger);

// Rate Limiting (apply to all requests or specific routes)
app.use(rateLimiter);

// Body Parsers
app.use(express.json()); // For JSON payloads
app.use(express.urlencoded({ extended: true })); // For URL-encoded payloads

// API Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/merchants`, merchantRoutes);
app.use(`${API_PREFIX}/accounts`, accountRoutes);
app.use(`${API_PREFIX}/transactions`, transactionRoutes);

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).json({ message: 'ALX Payment Processor API is running!' });
});

// Handle 404 Not Found
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(errorHandler);

export default app;
```