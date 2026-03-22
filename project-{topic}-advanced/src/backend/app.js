```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const { StatusCodes } = require('http-status-codes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors(corsOptions));

// Logging middleware
app.use(loggerMiddleware);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against XSS attacks
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Rate limiting to prevent brute-force attacks
const limiter = rateLimit({
    max: 100, // Max 100 requests per windowMs
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests from this IP, please try again after 15 minutes!',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter); // Apply to all /api routes

// API Documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);

// Catch all for undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, StatusCodes.NOT_FOUND));
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
```