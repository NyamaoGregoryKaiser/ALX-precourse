const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { globalRateLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Request Parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Global Rate Limiting
app.use(globalRateLimiter);

// API Routes
app.use('/api', routes);

// Catch-all for 404 Not Found
app.use((req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Resource not found.' });
});

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;