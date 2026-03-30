import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import config from './config';
import routesV1 from './routes/v1';
import errorHandler from './middleware/errorHandler';
import { ApiError } from './utils/ApiError';
import httpStatus from 'http-status';
import requestLogger from './middleware/logging';
import { apiRateLimiter } from './middleware/rateLimiter';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({ origin: config.cors.origins }));
app.options('*', cors()); // Enable pre-flight across all routes

// Parse json request body
app.use(bodyParser.json());

// Parse urlencoded request body
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// API rate limiting
app.use('/api/v1', apiRateLimiter); // Apply to all /api/v1 routes except auth which has its own

// v1 api routes
app.use('/api/v1', routesV1);

// Send 404 for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Global error handler
app.use(errorHandler);

export default app;
```

#### `backend/src/server.ts` (Entry point)
```typescript