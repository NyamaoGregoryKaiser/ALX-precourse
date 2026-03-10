```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const redisClient = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const tagRoutes = require('./routes/tagRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const app = express();

// Security Middlewares
app.use(helmet()); // Set security HTTP headers
app.use(xss());    // Prevent XSS attacks
app.use(hpp());    // Prevent HTTP Parameter Pollution

// CORS - Enable all CORS requests
app.use(cors({
  origin: config.frontendUrl, // Allow requests from frontend
  credentials: true, // Allow sending cookies
}));

// Body Parser
app.use(express.json()); // For JSON data
app.use(bodyParser.urlencoded({ extended: true })); // For URL-encoded data

// Logging Middleware
if (config.env === 'development') {
  app.use(morgan('dev')); // Dev logging
} else {
  // Custom token for morgan to include request ID if available
  morgan.token('id', function getId(req) {
    return req.id;
  });
  app.use(morgan(':id :method :url :status :response-time ms - :res[content-length]', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Session Management (using Redis)
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'cms-session', // Name of the session ID cookie
    cookie: {
      secure: config.env === 'production', // Use secure cookies in production
      httpOnly: true, // Prevent client-side JS from reading the cookie
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: 'lax', // Protect against CSRF
    },
  })
);

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', apiLimiter); // Apply to all API routes

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/media', mediaRoutes);

// Catch 404 and forward to error handler
app.use(notFound);

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
```