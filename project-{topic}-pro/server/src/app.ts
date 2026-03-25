import 'express-async-errors'; // Must be imported before routes
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import chatRoomRoutes from './routes/chatRoomRoutes';

import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimitMiddleware';
import loggingMiddleware from './middleware/loggingMiddleware';
import logger from './config/logger';

dotenv.config({ path: __dirname + '/../.env' }); // Load .env from server directory

const app: Application = express();

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security

// CORS Configuration
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({
    origin: clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request Body Parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Custom Logging Middleware
app.use(loggingMiddleware);

// API Rate Limiting (apply to all /api routes)
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat-rooms', chatRoomRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Catch-all for undefined routes
app.use('*', (req, res, next) => {
    logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: 'Route Not Found', statusCode: 404, errorCode: 'ROUTE_NOT_FOUND' });
});

// Centralized Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;