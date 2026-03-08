```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean'); // Typically, HTML escaping on output is better
const hpp = require('hpp'); // HTTP Parameter Pollution
const mongoSanitize = require('express-mongo-sanitize'); // Although we use SQL, good to be aware
const rateLimit = require('express-rate-limit');
const compression = require('compression'); // For response compression
const httpStatus = require('http-status-codes');

const config = require('../config/config');
const routes = require('./routes');
const { errorHandler, convertToApiError } = require('./middleware/errorHandler');
const { authLimiter } = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const ApiError = require('./utils/apiError');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());
app.options('*', cors());

// Parse JSON request body
app.use(express.json());

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data (against XSS and NoSQL injection)
// XSS: This is a basic layer; client-side output escaping is crucial.
// For SQL injection, Sequelize's parameterized queries are the primary defense.
app.use(xss()); // Cleans req.body, req.query, req.params to prevent XSS attacks
// app.use(mongoSanitize()); // Prevent NoSQL injection attacks (not directly applicable for SQL, but good to know)

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Gzip compression
app.use(compression());

// Request logging middleware
app.use(requestLogger);

// Limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// Serve static files (e.g., a simple frontend)
app.use(express.static('public'));

// V1 API routes
app.use('/v1', routes);

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Convert error to ApiError, if needed
app.use(convertToApiError);

// Handle errors
app.use(errorHandler);

module.exports = app;
```