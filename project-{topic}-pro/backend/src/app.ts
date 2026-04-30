```typescript
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';
import { AppDataSource } from './config/data-source';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { rateLimitMiddleware } from './middlewares/rateLimitMiddleware';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';
import { logger } from './utils/logger';

// --- Initialize Express App ---
const app = express();

// --- Security Middlewares ---
app.use(helmet()); // Sets various HTTP headers for security

// --- CORS Configuration ---
app.use(cors({
    origin: config.nodeEnv === 'development' ? '*' : 'http://localhost:3000', // Adjust for production frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- Request Logging ---
app.use(requestLogger);

// --- Rate Limiting (apply globally, more specific limits on auth routes) ---
app.use(rateLimitMiddleware);

// --- Body Parsers ---
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// --- Swagger Setup for API Documentation ---
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Task Management API',
            version: '1.0.0',
            description: 'Enterprise-grade API for managing tasks with authentication, authorization, and advanced features.',
            contact: {
                name: 'ALX Software Engineering',
                url: 'https://www.alxafrica.com',
            },
        },
        servers: [
            {
                url: `http://localhost:${config.port}/api/v1`,
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid', description: 'User ID' },
                        username: { type: 'string', description: 'User\'s username' },
                        email: { type: 'string', format: 'email', description: 'User\'s email' },
                        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
                        updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
                    },
                    required: ['id', 'username', 'email'],
                },
                TaskInput: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Title of the task', example: 'Buy groceries' },
                        description: { type: 'string', nullable: true, description: 'Detailed description of the task', example: 'Milk, eggs, bread, fruits' },
                        status: { type: 'string', enum: ['pending', 'in-progress', 'completed'], default: 'pending', description: 'Current status of the task', example: 'pending' },
                        dueDate: { type: 'string', format: 'date-time', nullable: true, description: 'Optional due date for the task', example: '2024-12-31T23:59:59Z' },
                    },
                    required: ['title'],
                },
                TaskUpdateInput: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Title of the task', example: 'Buy groceries' },
                        description: { type: 'string', nullable: true, description: 'Detailed description of the task', example: 'Milk, eggs, bread, fruits' },
                        status: { type: 'string', enum: ['pending', 'in-progress', 'completed'], default: 'pending', description: 'Current status of the task', example: 'pending' },
                        dueDate: { type: 'string', format: 'date-time', nullable: true, description: 'Optional due date for the task', example: '2024-12-31T23:59:59Z' },
                    },
                },
                Task: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid', description: 'Task ID' },
                        title: { type: 'string', description: 'Task title' },
                        description: { type: 'string', nullable: true, description: 'Task description' },
                        status: { type: 'string', enum: ['pending', 'in-progress', 'completed'], description: 'Task status' },
                        dueDate: { type: 'string', format: 'date-time', nullable: true, description: 'Task due date' },
                        userId: { type: 'string', format: 'uuid', description: 'ID of the user who owns the task' },
                        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
                        updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
                    },
                    required: ['id', 'title', 'status', 'userId'],
                },
                // Reusable error responses
                Responses: {
                    BadRequest: {
                        description: 'Bad Request / Validation Error',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        message: { type: 'string', example: 'Validation failed.' },
                                        errors: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    field: { type: 'string', example: 'email' },
                                                    message: { type: 'string', example: 'Invalid email format.' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    Unauthorized: {
                        description: 'Unauthorized - Authentication required or token invalid/expired',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        message: { type: 'string', example: 'Unauthorized.' }
                                    }
                                }
                            }
                        }
                    },
                    Forbidden: {
                        description: 'Forbidden - User does not have permission',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        message: { type: 'string', example: 'Forbidden.' }
                                    }
                                }
                            }
                        }
                    },
                    NotFound: {
                        description: 'Not Found - Resource not found',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        message: { type: 'string', example: 'Resource not found.' }
                                    }
                                }
                            }
                        }
                    },
                    TooManyRequests: {
                        description: 'Too Many Requests - Rate limit exceeded',
                        headers: {
                            'Retry-After': {
                                schema: { type: 'integer' },
                                description: 'Number of seconds to wait before retrying'
                            },
                            'X-RateLimit-Limit': {
                                schema: { type: 'integer' },
                                description: 'The maximum number of requests that the consumer is permitted to make per hour.'
                            },
                            'X-RateLimit-Remaining': {
                                schema: { type: 'integer' },
                                description: 'The number of requests remaining in the current rate limit window.'
                            },
                            'X-RateLimit-Reset': {
                                schema: { type: 'integer' },
                                description: 'The time at which the current rate limit window resets in UTC epoch seconds.'
                            }
                        },
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        message: { type: 'string', example: 'Too many requests, please try again later.' }
                                    }
                                }
                            }
                        }
                    },
                    ServerError: {
                        description: 'Internal Server Error',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        message: { type: 'string', example: 'An unexpected error occurred.' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        },
    },
    apis: ['./src/routes/*.ts'], // Path to the API routes files
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tasks', taskRoutes);

// --- Health Check Route ---
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// --- Catch-all for undefined routes ---
app.use((req, res, next) => {
    logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// --- Global Error Handling Middleware ---
app.use(errorHandler);

export default app;
```