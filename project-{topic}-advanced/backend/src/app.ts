import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import dataSourceRoutes from './routes/dataSourceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import visualizationRoutes from './routes/visualizationRoutes';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import { authenticateToken } from './middleware/authMiddleware'; // Auth for protected routes

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'http://your-frontend-domain.com' : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate Limiting
app.use(rateLimiter);

// Logger Middleware
app.use(loggerMiddleware);

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes (require authentication)
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/data-sources', authenticateToken, dataSourceRoutes);
app.use('/api/dashboards', authenticateToken, dashboardRoutes);
app.use('/api/visualizations', authenticateToken, visualizationRoutes);

// Catch-all for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Centralized Error Handling
app.use(errorHandler);

export default app;