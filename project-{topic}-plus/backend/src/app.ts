import 'reflect-metadata'; // Required for TypeORM
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/logger';
import { apiRateLimiter } from './middlewares/rateLimiter';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import scraperRoutes from './modules/scrapers/scraper.routes';
import scrapeJobRoutes from './modules/scrape-jobs/scrapeJob.routes';
import scrapedDataRoutes from './modules/scraped-data/scrapedData.routes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: config.frontendUrl })); // Restrict CORS to frontend URL
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded

// Custom Middlewares
app.use(requestLogger);
app.use(apiRateLimiter); // Apply rate limiting to all API requests

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scrapers', scraperRoutes);
app.use('/api/scrape-jobs', scrapeJobRoutes);
app.use('/api/scraped-data', scrapedDataRoutes);

// Catch-all for 404 Not Found
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global Error Handler (must be last middleware)
app.use(errorHandler);

export { app };