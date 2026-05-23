import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import morgan from 'morgan';
import helmet from 'helmet';
import hpp from 'hpp';
import cors from 'cors';
import { AppDataSource } from './database/data-source';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/authMiddleware';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';
import logger from './utils/logger';

// Import routes
import authRoutes from './modules/auth/routes/authRoutes';
import userRoutes from './modules/auth/routes/userRoutes';
import datasetRoutes from './modules/datasets/routes/datasetRoutes';
import modelRoutes from './modules/models/routes/modelRoutes';
import experimentRoutes from './modules/experiments/routes/experimentRoutes';
import preprocessingRoutes from './modules/preprocessing/routes/preprocessingRoutes';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// --- Security Middlewares ---
app.use(helmet()); // Set security-related HTTP headers
app.use(hpp()); // Protect against HTTP Parameter Pollution attacks
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'http://your-frontend-domain.com' : '*', // Adjust for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- Rate Limiting ---
app.use(rateLimitMiddleware); // Apply to all requests, adjust as needed

// --- Logging Middleware ---
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Dev logging
} else {
  // Production logging can be more structured or piped to external service
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// --- Body Parsers ---
app.use(express.json()); // For JSON payloads
app.use(express.urlencoded({ extended: true })); // For URL-encoded payloads

// --- Serve static files (e.g., uploaded dataset files) ---
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// --- API Routes ---
app.get('/', (req, res) => {
  res.send('ML Utils Hub API is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes); // Protected user routes
app.use('/api/datasets', authMiddleware, datasetRoutes);
app.use('/api/models', authMiddleware, modelRoutes);
app.use('/api/experiments', authMiddleware, experimentRoutes);
app.use('/api/preprocessing', authMiddleware, preprocessingRoutes);

// --- Global Error Handling Middleware ---
app.use(errorHandler);

export default app;
```