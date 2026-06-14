```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const datasetRoutes = require('./routes/datasetRoutes');
const modelRoutes = require('./routes/modelRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const errorHandler = require('./middleware/errorHandler');
const { requestLogger, errorLogger } = require('./utils/logger');
const rateLimiter = require('./middleware/rateLimiter');
const { connectRedis } = require('./config/redisConfig');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Redis
connectRedis();

// Static files for uploaded content
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded data
app.use(requestLogger); // Request logging
app.use(rateLimiter); // Apply rate limiting to all requests

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/predict', predictionRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'API is healthy' });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Error handling middleware
app.use(errorLogger); // Error logging
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    // In production, migrations should be run via CI/CD or separate script
    // await sequelize.sync({ alter: true }); // Use { force: true } only for development
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1); // Exit process if DB connection fails
  }
};

startServer();

module.exports = app; // For testing
```

#### Frontend (React)