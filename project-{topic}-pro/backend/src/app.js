const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const httpStatus = require('http-status');
const xss = require('xss-clean'); // Typically used for sanitizing HTML inputs. Can be integrated with Joi if needed.
const { ApiError, errorConverter, errorHandler } = require('./middlewares/errorMiddleware');
const routes = require('./api');
const { cacheMiddleware } = require('./middlewares/cacheMiddleware');
const logger = require('./utils/logger'); // Import logger

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());

// Enable cors
app.use(cors());
app.options('*', cors()); // pre-flight OPTIONS requests

// Cache middleware for GET requests
app.use(cacheMiddleware);

// API routes
app.use('/api', routes);

// Send 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

module.exports = app;