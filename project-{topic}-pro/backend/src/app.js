```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./api/routes');
const { errorHandler } = require('./middleware/error');
const logger = require('./utils/logger');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS for all routes
app.use(cors({
  origin: config.corsOrigin, // Consider making this more restrictive in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));

// Rate limiting to prevent brute-force attacks
const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 1 minute
  max: config.rateLimitMaxRequests,   // Max 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});
app.use(apiLimiter);

// Parse JSON request bodies
app.use(express.json());

// Logger middleware (optional, for every request)
// app.use((req, res, next) => {
//   logger.http(`${req.method} ${req.originalUrl}`);
//   next();
// });

// API routes
app.use('/api/v1', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Catch-all for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found', path: req.originalUrl });
});

// Global error handler middleware
app.use(errorHandler);

module.exports = app;
```