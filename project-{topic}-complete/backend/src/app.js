const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan'); // For HTTP request logging
const { errorHandler } = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');
const logger = require('./middleware/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const dataSourceRoutes = require('./routes/dataSource.routes');
const visualizationRoutes = require('./routes/visualization.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// --- Core Middleware ---
app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded data
app.use(cookieParser()); // Parses cookies
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow requests from frontend
    credentials: true // Allow sending cookies
}));
app.use(helmet()); // Sets various HTTP headers for security

// --- Logging Middleware (using Morgan for HTTP requests, Winston for app logs) ---
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));

// --- Rate Limiting ---
app.use(rateLimitMiddleware);

// --- Routes ---
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Data Visualization API!' });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data-sources', dataSourceRoutes);
app.use('/api/visualizations', visualizationRoutes);
app.use('/api/dashboards', dashboardRoutes);

// --- Error Handling Middleware (must be last) ---
app.use(errorHandler);

module.exports = app;