```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config';
import { errorHandler } from './middlewares/error-handler';
import { authRoutes } from './auth/auth.routes';
import { userRoutes } from './modules/user/user.routes';
import { dbConnectionRoutes } from './modules/db-connection/db-connection.routes';
import { monitoringRoutes } from './modules/monitoring/monitoring.routes';
import { recommendationRoutes } from './modules/recommendation/recommendation.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { requestLoggerMiddleware } from './shared/middlewares/request-logger';
import { rateLimiter } from './shared/middlewares/rate-limiter';

const app = express();

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
    origin: env.CLIENT_URL, // Allow requests from frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
}));

// Request Logging
app.use(morgan('dev')); // Console logging for requests
app.use(requestLoggerMiddleware); // Custom logger for detailed request info

// Rate Limiting
app.use(rateLimiter);

// Body Parsers
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies

// API Routes
app.get('/', (req, res) => {
    res.status(200).json({ message: 'DBOptiFlow API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/db-connections', dbConnectionRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Centralized Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;
```