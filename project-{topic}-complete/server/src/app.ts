import express from 'express';
import cors from 'cors';
import config from './config';
import { errorHandler } from './middlewares/error.middleware';
import { authRoutes, userRoutes, projectRoutes, taskRoutes } from './modules';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(cors({ origin: config.clientUrl })); // Allow requests from client origin
app.use(express.json()); // Body parser for JSON requests

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

export default app;