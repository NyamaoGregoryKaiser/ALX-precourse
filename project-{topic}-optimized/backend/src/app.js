require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const apiRoutes = require('./routes/index');
const { NotFoundError } = require('./utils/errors');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');
const { stream } = require('./middleware/logger'); // For Morgan

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// JSON Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
app.use(morgan('combined', { stream }));

// API Routes
app.use('/api/v1', apiRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Swagger/OpenAPI Documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../../docs/api/openapi.yml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Handle 404 Not Found errors
app.use((req, res, next) => {
  next(new NotFoundError(`The requested resource ${req.originalUrl} was not found.`));
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
```