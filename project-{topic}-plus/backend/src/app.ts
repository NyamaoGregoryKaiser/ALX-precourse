```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { jwtStrategy } from './config/passport';
import passport from 'passport';
import { logger } from './utils/logger';

// Import Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dataSourceRoutes from './routes/dataSource.routes';
import dashboardRoutes from './routes/dashboard.routes';
import chartRoutes from './routes/chart.routes';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors()); // Allow all origins for simplicity in dev, configure for production

// Logging Middleware
app.use(morgan('combined', { stream: { write: (message: string) => logger.http(message.trim()) } }));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
app.use(rateLimitMiddleware);

// Passport JWT Authentication
passport.use(jwtStrategy);
app.use(passport.initialize());

// API Documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../../docs/api.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data-sources', dataSourceRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/charts', chartRoutes);

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  res.status(404).json({ message: `Can't find ${req.originalUrl} on this server!` });
});

// Global Error Handling Middleware
app.use(errorHandler);

export { app };
```