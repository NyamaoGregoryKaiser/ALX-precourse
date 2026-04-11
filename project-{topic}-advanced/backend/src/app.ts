```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorMiddleware';
import apiRoutes from './routes';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';

const app = express();

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
  origin: config.frontendUrl, // Configure CORS based on your frontend URL
  credentials: true,
}));

// Request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting to prevent abuse
app.use(rateLimitMiddleware);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ message: `Cannot find ${req.originalUrl} on this server!` });
});

// Centralized error handling middleware (must be last)
app.use(errorHandler);

export default app;
```