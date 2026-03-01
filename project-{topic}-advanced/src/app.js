```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const config = require('./config/config');
const logger = require('./utils/logger');
const { ApiError } = require('./utils/ApiError');
const { errorConverter, errorHandler } = require('./middlewares/error');
const apiRoutes = require('./routes'); // All API routes
const authRoutes = require('./routes/auth.routes');
const path = require('path');

const app = express();

// Security Middlewares
app.use(helmet()); // Set security HTTP headers
app.use(cors());   // Enable CORS for all requests
app.options('*', cors()); // Enable pre-flight for all routes

// Request logging (Morgan)
// Using 'combined' format for production, 'dev' for development.
// Stream logs to Winston.
app.use(morgan(config.env === 'development' ? 'dev' : 'combined', { stream: { write: message => logger.info(message.trim()) } }));

// Parse JSON request body
app.use(express.json());

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true }));

// Data sanitization against XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

// Gzip compression for responses
app.use(compression());

// Rate limiting to prevent brute-force attacks and abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.rateLimit.maxRequests, // Max requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    keyGenerator: (req, res) => req.ip, // Use client IP for rate limiting
});
app.use('/api/', apiLimiter); // Apply rate limiting to all API routes

// Serve static frontend files (conceptual)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/v1/auth', authRoutes); // Authentication routes
app.use('/api/v1', apiRoutes);       // Main API routes

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
    next(new ApiError(404, 'Not Found - The requested API endpoint does not exist.'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle errors
app.use(errorHandler);

module.exports = app;
```