const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // Security middleware
const compression = require('compression'); // Compression middleware
const { rateLimiter } = require('./middleware/rateLimit');
const { requestLogger, errorLogger } = require('./middleware/logging');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// Security middleware
app.use(helmet());

// Enable CORS for all routes (adjust as needed for specific origins in production)
app.use(cors());

// Enable request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply compression
app.use(compression());

// Request logging middleware
app.use(requestLogger);

// Rate limiting middleware
app.use(rateLimiter);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Catch-all for undefined routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Error logging middleware (must be before the final error handler)
app.use(errorLogger);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;