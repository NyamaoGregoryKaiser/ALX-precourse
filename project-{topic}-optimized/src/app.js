import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import config from '../config/config.js';
import logger from './utils/logger.js';
import AppError from './utils/appError.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Import Routes
import authRoutes from './auth/auth.routes.js';
import userRoutes from './users/user.routes.js';
import teamRoutes from './teams/team.routes.js';
import projectRoutes from './projects/project.routes.js';
import taskRoutes from './tasks/task.routes.js';
import commentRoutes from './comments/comment.routes.js';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());
app.options('*', cors()); // Enable pre-flight across all routes

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Gzip compression
app.use(compression());

// HTTP request logger
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  // Use a custom token for Morgan to log details useful in production
  morgan.token('body', (req) => JSON.stringify(req.body));
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms :body', {
      stream: { write: (message) => logger.info(message.trim()) },
      skip: (req, res) => req.originalUrl.includes('/api-docs'), // Skip logging swagger requests
    })
  );
}

// Apply API rate limiter to all /api routes (excluding auth)
app.use('/api', apiLimiter);

// Load Swagger documentation
const swaggerDocument = YAML.load('./docs/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
logger.info(`Swagger API documentation available at /api-docs in ${config.env} mode.`);


// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/projects', projectRoutes);
// Nested routes for tasks and comments
app.use('/api/v1/projects/:projectId/tasks', taskRoutes); // Nested tasks under projects
app.use('/api/v1/tasks', taskRoutes); // Direct access to tasks (e.g., /tasks?assigneeId=...)
app.use('/api/v1/tasks/:taskId/comments', commentRoutes); // Nested comments under tasks


// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler middleware
app.use(errorHandler);

export default app;
```

```javascript