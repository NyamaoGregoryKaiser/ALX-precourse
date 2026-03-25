```typescript
import express from 'express';
import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import passport from 'passport'; // If implementing passport-jwt strategy
import httpStatus from 'http-status-codes';
import config from './config';
import morgan from './middlewares/morgan';
import { errorConverter, errorHandler } from './middlewares/error';
import ApiError from './utils/ApiError';
import routesV1 from './api/routes/v1';

const app = express();

// HTTP request logger
app.use(morgan.successHandler);
app.use(morgan.errorHandler);

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Enable cors
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.options('*', cors()); // Enable pre-flight for all routes

// Passport authentication (if using, e.g., for OAuth)
// app.use(passport.initialize());
// passport.use('jwt', jwtStrategy); // A JWT strategy could be defined here if using Passport

// V1 api routes
app.use('/api/v1', routesV1);

// Send 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

export default app;
```