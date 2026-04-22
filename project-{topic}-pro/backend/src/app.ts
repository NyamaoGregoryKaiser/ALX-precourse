```typescript
import 'dotenv/config'; // Load environment variables first
import "reflect-metadata"; // Required for TypeORM decorators

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandling';
import { requestLogger } from './middleware/logging';
import { apiRateLimiter } from './middleware/rateLimiting';
import { initializeDatabase } from './database/data-source';
import logger from './utils/logger';

// Import Routes
import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboards/dashboards.routes';
import dataSourceRoutes from './modules/data-sources/data-sources.routes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow requests from frontend
    credentials: true,
}));

// Request body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Middlewares
app.use(requestLogger);
app.use(apiRateLimiter); // Apply rate limiting to all API requests

// Initialize Database
initializeDatabase().then(() => {
    logger.info('Database initialized successfully.');
}).catch(error => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
});

// Define API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboards', dashboardRoutes);
app.use('/api/v1/data-sources', dataSourceRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Not Found Handler
app.use((req, res, next) => {
    res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// Error Handling Middleware
app.use(errorHandler);

export default app;
```