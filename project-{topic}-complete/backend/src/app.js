```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const { errorHandler } = require('./middleware/errorMiddleware');
const { requestLogger, errorLogger } = require('./middleware/loggerMiddleware');
const apiRoutes = require('./routes'); // Index routes file
const { limiter } = require('./middleware/rateLimitMiddleware');
const logger = require('./utils/logger');

const app = express();

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security
app.use(hpp());    // Protects against HTTP Parameter Pollution attacks

// CORS configuration (allow requests from frontend)
const corsOptions = {
    origin: config.frontendUrl, // Or '*' for development, but specify for production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Body parser for JSON requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// Rate limiting middleware
app.use(limiter);

// API Routes
app.use(config.apiVersion, apiRoutes);

// Root route - for health check or basic info
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to the E-commerce API!',
        version: config.apiVersion,
        environment: config.env
    });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
});

// Error logging middleware (should be before the main error handler)
app.use(errorLogger);

// Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
```