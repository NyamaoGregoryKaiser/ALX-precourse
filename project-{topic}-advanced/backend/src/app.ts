```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes'; // Example CRUD module
import { errorConverter, errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logger.middleware';
import { NotFoundError } from './utils/apiErrors';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({ origin: config.clientUrl, credentials: true }));

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes); // Example module

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
  next(new NotFoundError('Not Found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

export default app;
```