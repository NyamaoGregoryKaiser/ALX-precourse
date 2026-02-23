```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./middlewares/error');
const { setSecurityHeaders, corsConfig, xssSanitizer } = require('./middlewares/security');
const { apiLimiter } = require('./middlewares/rateLimit');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const logger = require('./utils/logger');
const config = require('./config');

const app = express();

// 1. GLOBAL MIDDLEWARES

// Enable CORS
app.use(corsConfig);

// Set security HTTP headers (Helmet)
app.use(setSecurityHeaders);

// Limit requests from same API (Rate Limiting)
app.use('/api', apiLimiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against XSS attacks
app.use(xssSanitizer);

// Log incoming requests (optional, for debugging)
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// 2. ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);

// Unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(404, `Can't find ${req.originalUrl} on this server!`));
});

// 3. GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
```