```typescript
import { Server as SocketIOServer, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { AuthenticatedRequest, JwtPayload, SocketMessage } from '../types';
import { authService } from '../auth/auth.service';
import { chatService } from '../chats/chat.service';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { User } from '@prisma/client';
import { sendMessageSchema } from '../utils/validators';

type CustomSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user: User }>;

export const setupSocketIO = (io: SocketIOServer) => {
  // Middleware for JWT authentication for WebSocket connections
  io.use(async (socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      logger.warn('Socket authentication failed: No token provided');
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication failed: No token provided'));
    }
    try {
      const decoded = await authService.validateToken(token); // Re-use backend JWT validation
      const user = await chatService.prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, email: true }
      });
      if (!user) {
        logger.warn(`Socket authentication failed: User with ID ${decoded.id} not found`);
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication failed: User not found'));
      }
      socket.data.user = user as User; // Attach user to socket
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token'));
    }
  });

  io.on('connection', (socket: CustomSocket) => {
    const user = socket.data.user;
    if (!user) {
      // Should not happen due to middleware, but good for type safety
      socket.disconnect(true);
      return;
    }

    logger.info(`User ${user.username} connected with socket ID: ${socket.id}`);

    // Track online users/presence (can use Redis for distributed systems)
    // For simplicity, we'll assume rooms handle presence for active chats

    socket.on('joinRoom', async (chatRoomId: string, callback: (status: string, message?: string) => void) => {
      try {
        const room = await chatService.getChatRoomById(chatRoomId);
        if (!room) {
          callback('error', 'Chat room not found');
          return;
        }

        // Check if user is a participant of the chat room
        const isParticipant = room.participants.some(p => p.user.id === user.id);
        if (!isParticipant) {
          // If not, try to join them (this might be redundant if frontend calls REST API first)
          await chatService.joinChatRoom(chatRoomId, user.id);
        }

        socket.join(chatRoomId);
        logger.info(`User ${user.username} (ID: ${user.id}) joined room: ${chatRoomId}`);
        io.to(chatRoomId).emit('userJoined', { userId: user.id, username: user.username, chatRoomId });
        callback('success');
      } catch (error) {
        logger.error(`Error joining room ${chatRoomId} for user ${user.username}:`, error);
        callback('error', error instanceof ApiError ? error.message : 'Failed to join room');
      }
    });

    socket.on('leaveRoom', (chatRoomId: string, callback: (status: string, message?: string) => void) => {
      socket.leave(chatRoomId);
      logger.info(`User ${user.username} (ID: ${user.id}) left room: ${chatRoomId}`);
      io.to(chatRoomId).emit('userLeft', { userId: user.id, username: user.username, chatRoomId });
      callback('success');
    });

    socket.on('chatMessage', async (msg: SocketMessage, callback: (status: string, data?: any) => void) => {
      try {
        if (msg.senderId !== user.id) {
          callback('error', 'Unauthorized sender ID');
          return;
        }
        // Validate message content using Zod schema
        const validatedData = sendMessageSchema.parse(msg);

        // Persist message to database
        const savedMessage = await chatService.sendMessage(validatedData.chatRoomId, validatedData.senderId, validatedData.content);

        // Broadcast message to all clients in the room
        io.to(validatedData.chatRoomId).emit('message', {
          id: savedMessage.id,
          chatRoomId: savedMessage.chatRoomId,
          senderId: savedMessage.senderId,
          senderUsername: user.username, // Attach username for display
          content: savedMessage.content,
          createdAt: savedMessage.createdAt.toISOString(),
        });
        logger.debug(`Message broadcasted in room ${validatedData.chatRoomId} by ${user.username}`);
        callback('success', { message: 'Message sent successfully' });
      } catch (error) {
        logger.error(`Error sending message in room ${msg.chatRoomId} by ${user.username}:`, error);
        callback('error', error instanceof ApiError || error instanceof Error ? error.message : 'Failed to send message');
      }
    });

    socket.on('typing', (chatRoomId: string) => {
      // Broadcast to other users in the room that this user is typing
      socket.to(chatRoomId).emit('typing', { userId: user.id, username: user.username, chatRoomId });
    });

    socket.on('stopTyping', (chatRoomId: string) => {
      // Broadcast to other users in the room that this user stopped typing
      socket.to(chatRoomId).emit('stopTyping', { userId: user.id, username: user.username, chatRoomId });
    });

    socket.on('disconnect', () => {
      logger.info(`User ${user.username} disconnected (socket ID: ${socket.id})`);
      // Optionally, broadcast to all rooms the user was in that they disconnected
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for user ${user.username} (ID: ${user.id}):`, err);
    });
  });
};
```