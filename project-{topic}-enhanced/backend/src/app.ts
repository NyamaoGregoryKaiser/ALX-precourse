```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import logger, { loggerStream } from './utils/logger';
import { apiRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

// Import Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';

// Create Express app
const app = express();

// --- Security, Logging, and Middleware ---

// Enable CORS for all origins (adjust for production)
app.use(cors({
  origin: config.nodeEnv === 'development' ? '*' : ['http://localhost:3000', 'http://frontend-service-url.com'], // Adjust in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Apply Helmet middleware for enhanced security headers
app.use(helmet());

// Apply rate limiting to all requests
app.use(apiRateLimiter);

// Morgan for HTTP request logging (combined with Winston)
app.use(morgan('combined', { stream: loggerStream }));

// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// Authentication routes
app.use('/api/auth', authRoutes);
// User routes (protected)
app.use('/api/users', userRoutes);
// Product routes (protected)
app.use('/api/products', productRoutes);

// --- Error Handling Middleware ---

// 404 Not Found handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
```