```javascript
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const config = require('./config');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); // Assume these exist
const merchantRoutes = require('./routes/merchantRoutes'); // Assume these exist
const paymentMethodRoutes = require('./routes/paymentMethodRoutes'); // Assume these exist
const transactionRoutes = require('./routes/transactionRoutes');
const webhookRoutes = require('./routes/webhookRoutes'); // For incoming webhooks from external services

const app = express();

// 1. GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
app.use('/api', apiLimiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// Not directly relevant for SQL, but good practice for any JSON input.

// Prevent parameter pollution
app.use(hpp({
  whitelist: [ // Parameters that are allowed to be duplicated in query string
    'amount', 'currency', 'status', 'type', 'created_at'
  ]
}));

// Enable CORS for all origins (adjust in production)
app.use(cors());
app.options('*', cors()); // For pre-flight requests

// Compress all responses
app.use(compression());

// 2. ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/webhooks', webhookRoutes); // For receiving webhooks (e.g., from mock gateway)

// Unhandled Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND'));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

module.exports = app;
```