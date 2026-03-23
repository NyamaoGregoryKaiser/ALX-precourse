```typescript
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { setupSocketIO } from './websocket/socket.handler';

const prisma = new PrismaClient();
const httpServer = createServer(app);

// Initialize Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000, // Increase ping timeout for unreliable networks
});

setupSocketIO(io); // Attach Socket.IO handlers

let server: any;

// Function to connect to DB and start server
const startServer = async () => {
  try {
    // Connect to PostgreSQL via Prisma
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    server = httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (err) {
    logger.error('Failed to connect to database or start server:', err);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown
const exitHandler = async () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      prisma.$disconnect().then(() => {
        logger.info('Disconnected from PostgreSQL database');
        process.exit(1);
      }).catch((e) => {
        logger.error('Error disconnecting from database:', e);
        process.exit(1);
      });
    });
  } else {
    process.exit(1);
  }
};

process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler); // For Ctrl+C
```