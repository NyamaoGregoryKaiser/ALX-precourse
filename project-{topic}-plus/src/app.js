```javascript
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const errorHandler = require('./api/middlewares/errorHandler');
const { apiRateLimiter } = require('./api/middlewares/rateLimitMiddleware');
const logger = require('./config/logger');
const config = require('./config');

// Routes imports
const authRoutes = require('./api/routes/authRoutes');
const userRoutes = require('./api/routes/userRoutes');
const categoryRoutes = require('./api/routes/categoryRoutes');
const taskRoutes = require('./api/routes/taskRoutes');

const app = express();

// 1. Security HTTP Headers
app.use(helmet());

// 2. CORS - Cross Origin Resource Sharing
// Allow requests from all origins in development, restrict in production
const corsOptions = {
  origin: config.env === 'production' ? 'https://your-frontend-domain.com' : '*', // Replace with your frontend URL in production
  credentials: true, // Allow cookies to be sent with requests
};
app.use(cors(corsOptions));

// 3. Development logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// 4. Rate Limiting for all API routes
app.use('/api', apiRateLimiter);

// 5. Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // For form data
app.use(cookieParser()); // Parse cookies attached to the request

// 6. Define API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/tasks', taskRoutes);

// 7. Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Backend is healthy!' });
});

// 8. Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 9. Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
```