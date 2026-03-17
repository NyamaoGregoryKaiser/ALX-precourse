const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/logging');
const { apiLimiter } = require('./middleware/rateLimiter');
const apiRoutes = require('./routes'); // All aggregated API routes
const swaggerDocument = require('../swagger.json'); // OpenAPI spec

const app = express();

// Apply rate limiting to all API requests
app.use(apiLimiter);

// Request logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// API Routes
app.use('/api', apiRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Payment Processor API is healthy.' });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;