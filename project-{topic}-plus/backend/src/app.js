```javascript
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { v4: uuidv4 } = require('uuid'); // For unique request IDs

const appConfig = require('./config/app');
const logger = require('./utils/logger');
const apiRateLimiter = require('./middlewares/rateLimitMiddleware');
const errorHandler = require('./middlewares/errorHandler');
const { AppError } = require('./utils/appError');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// --- Global Middlewares ---

// Add a unique ID to each request for logging/tracing
app.use((req, res, next) => {
  req.id = uuidv4();
  next();
});

// CORS - Enable all CORS requests
app.use(cors());

// Request logging (Morgan)
// 'dev' for development, 'combined' for production (more details)
if (appConfig.env === 'development') {
  app.use(morgan('dev'));
} else {
  // Custom token to include request ID
  morgan.token('id', (req) => req.id);
  app.use(morgan(':id :method :url :status :res[content-length] - :response-time ms'));
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for API requests
app.use(apiRateLimiter);

// --- API Routes ---

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Product Management API! Visit /api-docs for documentation.',
    version: appConfig.version || '1.0.0',
    environment: appConfig.env,
  });
});

// Base API endpoint
const API_BASE_PATH = '/api/v1';
app.use(`${API_BASE_PATH}/auth`, authRoutes);
app.use(`${API_BASE_PATH}/users`, userRoutes);
app.use(`${API_BASE_PATH}/products`, productRoutes);

// --- API Documentation (Swagger/OpenAPI) ---
const swaggerSpec = swaggerJsdoc(require('../swagger'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Error Handling ---

// Catch-all for undefined routes (404 Not Found)
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
```