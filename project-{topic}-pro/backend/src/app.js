const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

const config = require('./config/config');
const { applyRateLimiting } = require('./middleware/rateLimit');
const { applyCacheMiddleware } = require('./middleware/cache');
const errorMiddleware = require('./middleware/error');
const requestLogger = require('./middleware/logger');
const apiRoutes = require('./routes');
const AppError = require('./utils/appError');
const logger = require('./utils/logger');

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: config.frontendUrl, // Allow requests from your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Apply rate limiting (before caching, so malicious requests are limited)
app.use(applyRateLimiting());

// Apply caching for GET requests (for specific routes, example below)
// For a full system, you might apply this selectively to read-heavy, less-frequently-changing routes.
// For now, let's keep it simple and apply to /projects GET.
// This is an example; actual implementation might be per-route in controllers.
app.use('/api/projects', applyCacheMiddleware());


// API Routes
app.use('/api', apiRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Handle 404 - Not Found
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;