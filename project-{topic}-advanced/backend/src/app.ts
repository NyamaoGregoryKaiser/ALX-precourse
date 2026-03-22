```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';

// Import route modules
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import databaseRoutes from './modules/databases/database.routes';
import queryRoutes from './modules/queries/query.routes';
import { CustomError } from './utils/error';

const app: Application = express();

// Security Middleware
app.use(helmet());

// CORS - Allow cross-origin requests
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow requests from your frontend
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom request logger
app.use(requestLogger);

// Apply rate limiting to all requests
app.use(apiRateLimiter);

// --- API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/databases', databaseRoutes);
app.use('/api/v1/queries', queryRoutes);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// --- Catch 404 and forward to error handler ---
app.use((req, res, next) => {
  next(new CustomError(`Not Found - ${req.originalUrl}`, 404));
});

// --- Global Error Handler ---
app.use(errorHandler);

export default app;
```

#### `backend/src/server.ts`