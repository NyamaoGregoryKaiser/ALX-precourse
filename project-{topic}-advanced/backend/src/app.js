const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const httpStatus = require('http-status');
const config = require('./config/config');
const { errorConverter, errorHandler } = require('./middleware/error.middleware');
const { apiLogger } = require('./middleware/logger.middleware');
const { limiter } = require('./middleware/rateLimit.middleware');
const ApiError = require('./utils/ApiError');
const routes = require('./routes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse incoming requests with JSON payloads
app.use(express.json());

// Parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());

// Gzip compression
app.use(compression());

// Enable CORS
app.use(cors());
app.options('*', cors());

// API request logging
app.use(apiLogger);

// Limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use(limiter);
}

// API routes
app.use('/api/v1', routes);

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle errors
app.use(errorHandler);

module.exports = app;