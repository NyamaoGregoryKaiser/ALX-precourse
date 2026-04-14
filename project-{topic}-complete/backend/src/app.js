```javascript
const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize'); // Placeholder, useful for NoSQL, but good practice awareness
const compression = require('compression');
const cors = require('cors');
const httpStatus = require('http-status');
const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { errorConverter, errorHandler } = require('./middleware/error.middleware');
const AppError = require('./utils/AppError');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const scrapingJobRoutes = require('./routes/scrapingJob.routes');
const scrapedDataRoutes = require('./routes/scrapedData.routes');
const logger = require('./config/logger');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());
app.use(mongoSanitize()); // Prevent NoSQL injection attacks (even if using SQL, good to have)

// Gzip compression
app.use(compression());

// Enable cors
app.use(cors());
app.options('*', cors());

// Limit repeated failed requests to auth endpoints
if (config.env === 'production') {
    app.use('/api', apiLimiter); // Apply general API rate limiting
}


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', scrapingJobRoutes);
app.use('/api/data', scrapedDataRoutes);

// send 404 error for any unknown api request
app.use((req, res, next) => {
    next(new AppError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to AppError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
```