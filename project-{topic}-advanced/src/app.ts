```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import apiRoutes from './routes';
import { ENV } from './config';
import { logger } from './utils/logger';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: ENV.NODE_ENV === 'production' ? 'https://yourproductiondomain.com' : '*', // Adjust for production
  credentials: true,
}));

// Request Logging
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Body Parsers
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// Rate Limiting (apply to all requests or specific routes)
app.use(rateLimiter);

// API Routes
app.use('/api/v1', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Error Handling Middlewares
app.use(notFoundHandler); // Handle 404 Not Found
app.use(errorHandler);    // Centralized error handling

export default app;
```