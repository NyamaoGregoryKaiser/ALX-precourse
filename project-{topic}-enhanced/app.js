```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./utils/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// Set security headers
app.use(helmet());

// Enable CORS for client applications
app.use(cors({
  origin: config.clientUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// HTTP parameter pollution protection
app.use(hpp());

// Compression middleware
app.use(compression());

// Body parser for JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Morgan for logging HTTP requests
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
    skip: (req, res) => process.env.NODE_ENV === 'test', // Skip logging in test environment
  }
);
app.use(morganMiddleware);

// Apply rate limiting to all requests
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  const error = new Error(`Can't find ${req.originalUrl} on this server!`);
  error.statusCode = 404;
  error.isOperational = true; // Mark as operational error
  next(error);
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
```