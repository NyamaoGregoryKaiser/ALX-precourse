const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const httpStatus = require('http-status');
const config = require('./config/config');
const { errorConverter, errorHandler } = require('./middleware/error');
const apiRoutes = require('./routes/v1');
const { jwtAuth } = require('./middleware/auth'); // Used for a specific route example
const { rateLimiter } = require('./middleware/rateLimiter');
const ApiError = require('./utils/ApiError');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());

// Gzip compression
app.use(compression());

// Enable CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new ApiError(httpStatus.FORBIDDEN, 'Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Apply rate limiting to all requests
app.use(rateLimiter);

// API routes
app.use('/v1', apiRoutes);

// send 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not Found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;