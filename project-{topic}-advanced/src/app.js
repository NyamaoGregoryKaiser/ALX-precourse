```javascript
const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const httpStatus = require('http-status');
const expressRateLimit = require('express-rate-limit');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const config = require('../config/config');
const routes = require('./routes');
const { errorConverter, errorHandler } = require('./middleware/error.middleware');
const ApiError = require('./utils/ApiError');
const logger = require('./utils/logger');
const swaggerSpec = require('../config/swagger');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());
app.options('*', cors()); // Enable pre-flight for all routes

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());

// Gzip compression
app.use(compression());

// Logger for HTTP requests
// Use 'combined' format for production, 'dev' for development
app.use(morgan(config.env === 'development' ? 'dev' : 'combined', { stream: { write: message => logger.info(message.trim()) } }));

// Initialize Redis client and store for rate limiting
const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect().then(() => logger.info('Redis client connected')).catch((err) => logger.error('Redis client connection failed', err));

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'rate-limit:',
});

// Rate limiting middleware
const apiLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: redisStore, // Use Redis to store hit counts
  message: 'Too many requests from this IP, please try again after 15 minutes',
  keyGenerator: (req) => req.ip, // Use IP as the key for rate limiting
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
});

app.use('/api/', apiLimiter); // Apply rate limiting to all API routes

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// API routes
app.use('/api/v1', routes);

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not Found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle errors
app.use(errorHandler);

module.exports = app;
```