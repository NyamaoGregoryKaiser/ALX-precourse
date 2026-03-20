const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const httpStatus = require('http-status');

const config = require('./config');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const httpLogger = require('./middlewares/logger.middleware');
const apiLimiter = require('./middlewares/rateLimit.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());
app.options('*', cors()); // Enable pre-flight for all routes

// Parse JSON request body
app.use(express.json());

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true }));

// Gzip compression
app.use(compression());

// HTTP request logger
app.use(httpLogger);

// Apply rate limiting to all requests
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(httpStatus.OK).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);

// Catch 404 and forward to error handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;