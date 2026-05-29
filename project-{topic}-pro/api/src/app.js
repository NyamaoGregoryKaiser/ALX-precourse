```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const httpStatus = require('http-status');
const { successLogger, errorLogger } = require('./middleware/loggingMiddleware');
const { errorConverter, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const ApiError = require('./utils/ApiError');
const config = require('./config/config');
const routes = require('./routes'); // Index of all routes
const logger = require('./config/logger');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse incoming request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());
app.options('*', cors()); // Enable pre-flight across all routes

// Request logging (before rate limit to log all requests)
app.use(successLogger);
app.use(errorLogger);

// Limit repeated failed requests to auth endpoints (configured in auth routes)
if (config.env === 'production') {
  app.use(config.apiVersion, apiLimiter); // Apply general API rate limit to all /api/v1 routes
}

// API routes
app.use(config.apiVersion, routes);

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not Found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle errors
app.use(errorHandler);

module.exports = app;
```