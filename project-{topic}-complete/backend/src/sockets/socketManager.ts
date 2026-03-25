```typescript
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import messageService from '../services/messageService';
import {
  AuthPayload,
  SocketJoinRoomPayload,
  SocketSendMessagePayload,
  SocketMessageReceivedPayload,
  SocketUserEventPayload,
  SocketTypingPayload,
} from '../types';
import roomService from '../services/roomService';
import { cache } from '../utils/cache';

interface CustomSocket extends Socket {
  user?: User;
  roomId?: string; // Track which room the user is currently in
}

const activeUsersInRooms: { [roomId: string]: Set<string> } = {}; // roomId -> Set of userId

// Helper to get user details from cache or DB
const getUserDetails = async (userId: string) => {
  const cacheKey = `socket:user_details:${userId}`;
  return cache.wrap(cacheKey, async () => {
    const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
    return user ? { id: user.id, username: user.username } : null;
  }, 300); // Cache for 5 minutes
};

export const initializeSocketIO = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io', // Custom path for socket.io
  });

  io.use(async (socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided.'));
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
      const user = await AppDataSource.getRepository(User).findOneBy({ id: payload.userId });

      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }
      socket.user = user;
      logger.info(`Socket authenticated for user: ${user.username} (${user.id})`);
      next();
    } catch (error: any) {
      logger.error('Socket authentication failed:', error.message);
      next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  io.on('connection', (socket: CustomSocket) => {
    logger.info(`User ${socket.user?.username} connected with socket ID: ${socket.id}`);

    socket.on('join_room', async (payload: SocketJoinRoomPayload, callback?: (status: string) => void) => {
      if (!socket.user || socket.user.id !== payload.userId) {
        return callback?.('Authorization error: Mismatched user ID.');
      }

      // Check if room exists
      const room = await roomService.getRoomById(payload.roomId);
      if (!room) {
        logger.warn(`User ${socket.user.username} tried to join non-existent room: ${payload.roomId}`);
        return callback?.('Room not found.');
      }

      // Leave previous room if any
      if (socket.roomId && socket.roomId !== payload.roomId) {
        socket.leave(socket.roomId);
        if (activeUsersInRooms[socket.roomId]) {
          activeUsersInRooms[socket.roomId].delete(socket.user.id);
          // Notify old room that user left
          io.to(socket.roomId).emit('user_left', {
            roomId: socket.roomId,
            userId: socket.user.id,
            username: socket.user.username,
          } as SocketUserEventPayload);
        }
        logger.info(`User ${socket.user.username} left room ${socket.roomId}`);
      }

      socket.join(payload.roomId);
      socket.roomId = payload.roomId;

      if (!activeUsersInRooms[payload.roomId]) {
        activeUsersInRooms[payload.roomId] = new Set();
      }
      const userWasAlreadyActive = activeUsersInRooms[payload.roomId].has(socket.user.id);
      activeUsersInRooms[payload.roomId].add(socket.user.id);

      logger.info(`User ${socket.user.username} joined room: ${payload.roomId}`);

      // Notify others in the room
      if (!userWasAlreadyActive) { // Only notify if this is the first connection for this user in this room
        socket.to(payload.roomId).emit('user_joined', {
          roomId: payload.roomId,
          userId: socket.user.id,
          username: socket.user.username,
        } as SocketUserEventPayload);
      }

      // Provide list of active users to the joining user
      const currentActiveUsers = Array.from(activeUsersInRooms[payload.roomId]).map(id => ({ userId: id, username: "Fetching..." })); // Placeholder for username
      // Fetch actual usernames for active users
      const usersWithNames = await Promise.all(
        Array.from(activeUsersInRooms[payload.roomId]).map(async (id) => {
          const details = await getUserDetails(id);
          return details || { id: id, username: 'Unknown User' };
        })
      );
      callback?.(JSON.stringify({ status: 'success', activeUsers: usersWithNames }));
    });

    socket.on('send_message', async (payload: SocketSendMessagePayload, callback?: (status: string) => void) => {
      if (!socket.user || socket.user.id !== payload.senderId) {
        return callback?.('Authorization error: Mismatched sender ID.');
      }
      if (!socket.roomId || socket.roomId !== payload.roomId) {
        return callback?.('Error: Not in the specified room.');
      }

      try {
        const message = await messageService.createMessage(
          payload.roomId,
          payload.senderId,
          payload.senderName,
          payload.content
        );

        const messageData: SocketMessageReceivedPayload = {
          id: message.id,
          roomId: message.roomId,
          senderId: message.senderId,
          senderName: message.senderName,
          content: message.content,
          timestamp: message.createdAt.toISOString(),
        };

        io.to(payload.roomId).emit('receive_message', messageData);
        callback?.('success');
      } catch (error: any) {
        logger.error(`Error sending message in room ${payload.roomId}:`, error);
        callback?.(`Error: ${error.message || 'Could not send message.'}`);
      }
    });

    socket.on('typing_start', (payload: SocketTypingPayload) => {
      if (socket.user && socket.roomId === payload.roomId) {
        socket.to(payload.roomId).emit('typing_start', {
          ...payload,
          userId: socket.user.id,
          username: socket.user.username,
        });
      }
    });

    socket.on('typing_stop', (payload: SocketTypingPayload) => {
      if (socket.user && socket.roomId === payload.roomId) {
        socket.to(payload.roomId).emit('typing_stop', {
          ...payload,
          userId: socket.user.id,
          username: socket.user.username,
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User ${socket.user?.username} disconnected with socket ID: ${socket.id}`);
      if (socket.roomId && socket.user) {
        if (activeUsersInRooms[socket.roomId]) {
          activeUsersInRooms[socket.roomId].delete(socket.user.id);
          // Check if user has other active connections in the same room
          const hasOtherConnections = Array.from(io.sockets.sockets.values()).some(
            (s: CustomSocket) => s.user?.id === socket.user?.id && s.roomId === socket.roomId
          );
          if (!hasOtherConnections) {
            io.to(socket.roomId).emit('user_left', {
              roomId: socket.roomId,
              userId: socket.user.id,
              username: socket.user.username,
            } as SocketUserEventPayload);
            logger.info(`User ${socket.user.username} left room ${socket.roomId} (last connection).`);
          }
        }
      }
    });

    socket.on('error', (err: any) => {
      logger.error(`Socket error for ${socket.user?.username || socket.id}:`, err);
    });
  });
};
```