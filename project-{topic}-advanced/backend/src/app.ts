```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { apiErrorHandler } from './middlewares/errorHandler.middleware';
import { requestLogger } from './middlewares/logger.middleware';
import { rateLimiter } from './middlewares/rateLimiter.middleware';
import config from './config/config';
import { seedDatabase } from './data-source';
import AppRoutes from './routes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl, // Allow requests from frontend origin
  credentials: true,
}));

// Performance Middlewares
app.use(compression());
app.use(rateLimiter); // Apply rate limiting to all requests

// Request logging middleware
app.use(requestLogger);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan for HTTP request logging (tiny format for production)
app.use(morgan('dev')); // Use 'combined' or 'tiny' for production

// API Routes
app.use('/api/v1', AppRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Swagger/OpenAPI Documentation
const swaggerDocument = YAML.load(path.resolve(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Seed database endpoint (for development/testing)
if (config.nodeEnv !== 'production') {
  app.get('/api/v1/seed', async (req, res, next) => {
    try {
      await seedDatabase();
      res.status(200).send('Database seeded successfully!');
    } catch (error) {
      next(error); // Pass error to the error handling middleware
    }
  });
}

// Error Handling Middleware (must be last)
app.use(apiErrorHandler);

export default app;
```