import 'reflect-metadata'; // Required for TypeORM
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './database/data-source';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/loggingMiddleware';
import { apiRateLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';

const app = express();

// Initialize Database
AppDataSource.initialize()
    .then(() => {
        console.log('Database connected successfully!');
    })
    .catch((error) => console.error('Database connection error:', error));

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));

// Request Logger
app.use(requestLogger);

// Rate Limiting (apply to all requests or specific routes)
app.use(apiRateLimiter);

// JSON Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes); // Nested under project routes in practice

// Root endpoint for health check
app.get('/', (req, res) => {
    res.status(200).send('Task Management API is running!');
});

// Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;