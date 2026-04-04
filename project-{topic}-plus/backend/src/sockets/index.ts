```typescript
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authenticateSocket } from './middleware';
import { userService } from '../services/user.service';
import { logger } from '../config/winston';
import { conversationService } from '../services/conversation.service';
import { messageService } from '../services/message.service';
import { UserStatus } from '@prisma/client';
import { redisClient } from '../config/redis';

// Global Socket.IO instance (re-exported for use in controllers)
let io: SocketIOServer;

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
}

export const setupSocketIO = (socketIoInstance: SocketIOServer) => {
  io = socketIoInstance;

  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.username} (${socket.userId})`);

    // Set user online status
    await userService.updateUserStatus(socket.userId, UserStatus.ONLINE);
    // Broadcast online status to all connected clients
    io.emit('user_online', { userId: socket.userId, username: socket.username });

    // Store socket ID with user ID for direct messaging or tracking
    await redisClient.sAdd(`user_sockets:${socket.userId}`, socket.id);


    // Handle joining a conversation room
    socket.on('join_conversation', async (payload: { conversationId: string }) => {
      const { conversationId } = payload;
      const isParticipant = await conversationService.isUserInConversation(socket.userId, conversationId);

      if (isParticipant) {
        socket.join(conversationId);
        logger.info(`${socket.username} (${socket.userId}) joined conversation: ${conversationId}`);
      } else {
        logger.warn(`${socket.username} (${socket.userId}) attempted to join unauthorized conversation: ${conversationId}`);
        socket.emit('error', { message: 'Unauthorized to join this conversation' });
      }
    });

    // Handle leaving a conversation room
    socket.on('leave_conversation', (payload: { conversationId: string }) => {
      const { conversationId } = payload;
      socket.leave(conversationId);
      logger.info(`${socket.username} (${socket.userId}) left conversation: ${conversationId}`);
    });

    // Handle sending a message
    socket.on('send_message', async (payload: { conversationId: string; content: string }) => {
      const { conversationId, content } = payload;
      try {
        const message = await messageService.createMessage(conversationId, socket.userId, content);

        // Emit to all clients in the conversation room, including sender
        io.to(conversationId).emit('receive_message', {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          sender: {
            id: socket.userId,
            username: socket.username,
          },
          content: message.content,
          createdAt: message.createdAt,
        });
        logger.debug(`Message sent in ${conversationId} by ${socket.username}`);
      } catch (error) {
        logger.error(`Failed to send message for ${socket.username} in ${conversationId}:`, error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (payload: { conversationId: string }) => {
      const { conversationId } = payload;
      socket.to(conversationId).emit('typing_started', {
        conversationId,
        userId: socket.userId,
        username: socket.username,
      });
      logger.debug(`${socket.username} started typing in ${conversationId}`);
    });

    socket.on('typing_stop', (payload: { conversationId: string }) => {
      const { conversationId } = payload;
      socket.to(conversationId).emit('typing_stopped', {
        conversationId,
        userId: socket.userId,
      });
      logger.debug(`${socket.username} stopped typing in ${conversationId}`);
    });

    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${socket.username} (${socket.userId})`);

      await redisClient.sRem(`user_sockets:${socket.userId}`, socket.id);
      const remainingSockets = await redisClient.sMembers(`user_sockets:${socket.userId}`);

      // If no other sockets for this user are online, set status to offline
      if (remainingSockets.length === 0) {
        await userService.updateUserStatus(socket.userId, UserStatus.OFFLINE);
        io.emit('user_offline', { userId: socket.userId });
        logger.info(`User ${socket.userId} is now offline.`);
      }
    });
  });
};

// Export io instance for use in controllers if needed (e.g., for REST API to trigger socket events)
export { io };
```