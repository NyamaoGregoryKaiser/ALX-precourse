const express = require('express');
const cors = require('cors');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load API routes
const authRoutes = require('./modules/auth/routes');
const customerRoutes = require('./modules/customers/routes');
const paymentMethodRoutes = require('./modules/paymentMethods/routes');
const transactionRoutes = require('./modules/transactions/routes');
const webhookRoutes = require('./modules/webhooks/routes');

const app = express();

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));

// Global Middlewares
app.use(cors()); // Enable CORS for all origins by default
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(logger.morganMiddleware); // HTTP request logging
app.use(rateLimiter); // Apply rate limiting to all requests

// Serve static files (for frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route Handlers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;