require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet'); // Security middleware

const authRoutes = require('./routes/authRoutes');
const scrapeRoutes = require('./routes/scrapeRoutes');
const errorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./config/logger');

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration (Adjust for production)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow requests from frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Request logging (Winston)
app.use(requestLogger);

// Morgan for development logging (optional, can be removed in production if Winston is sufficient)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// JSON Body Parser
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', scrapeRoutes); // Prefix all other routes with /api

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Root endpoint for basic info
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Web Scraping API. Use /api routes.' });
});

// Error Handling Middleware (must be last)
app.use(errorHandler);

module.exports = app;