```typescript
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { logger } from './config/winston';
import { setupSocketIO } from './sockets';
import { config } from './config';
import prisma from './prisma'; // Import prisma client

const port = config.port;
const httpServer = createServer(app);

// Initialize Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin, // Allow frontend origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Optionally use Redis adapter for scaling with multiple Socket.IO servers
  // adapter: createAdapter(redisClient, redisPublisher),
});

setupSocketIO(io);

// Start the server
httpServer.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`CORS origin: ${config.corsOrigin}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

  // Test DB connection
  prisma.$connect()
    .then(() => logger.info('Database connected successfully.'))
    .catch((err) => logger.error('Database connection failed:', err));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed.');
    io.close(() => {
      logger.info('Socket.IO server closed.');
      prisma.$disconnect()
        .then(() => logger.info('Prisma client disconnected.'))
        .catch((err) => logger.error('Prisma client disconnection failed:', err));
      process.exit(0);
    });
  });
});
```