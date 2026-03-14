import 'reflect-metadata'; // Required for TypeORM
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import workspaceRoutes from './routes/workspace.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import commentRoutes from './routes/comment.routes';
import { rateLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.NODE_ENV === 'production' ? 'https://your-frontend-domain.com' : '*', // Adjust for your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Logging middleware
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Rate limiting to prevent abuse
app.use(rateLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);

// Catch-all for undefined routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Global Error Handler (must be last middleware)
app.use(errorHandler);

export default app;