```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const xss = require('xss-clean'); // Removed, helmet already has equivalent for XSS. Add 'express-mongo-sanitize' if using Mongo.
const { jwtStrategy } = require('./config/passport');
const { config } = require('./config/config');
const { errorHandler } = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const httpLogger = require('./middleware/logger');
const apiRateLimiter = require('./middleware/rateLimiter');
const routes = require('./routes/v1'); // API routes
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger'); // Swagger configuration

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data (if you need it, e.g. for MongoDB, or for general query/body sanitization)
// app.use(xss()); // Helmet's `contentSecurityPolicy` or `noSniff` are better. If specific data sanitization is needed for inputs, implement it at validation level.

// enable cors
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// HTTP request logger
app.use(httpLogger);

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// Apply rate limiting to all API requests
app.use(config.apiPrefix, apiRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(httpStatus.OK).send('OK');
});

// Swagger API documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// v1 api routes
app.use(config.apiPrefix, routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// handle error
app.use(errorHandler);

module.exports = app;
```