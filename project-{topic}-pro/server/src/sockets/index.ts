import { Server as SocketIOServer } from 'socket.io';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import { Message } from '../database/entities/Message';
import { Conversation } from '../database/entities/Conversation';
import { CustomError } from '../utils/error';
import { RedisService } from '../services/redis.service';
import { Logger } from '../utils/logger';

interface AuthenticatedSocket extends SocketIO.Socket {
  userId?: string;
  username?: string;
}

export const setupSocketIO = (io: SocketIOServer) => {
  const userRepository = AppDataSource.getRepository(User);
  const messageRepository = AppDataSource.getRepository(Message);
  const conversationRepository = AppDataSource.getRepository(Conversation);

  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new CustomError('Authentication token missing', 401));
    }
    try {
      // In a real app, verify JWT here and extract user info
      // For simplicity, let's assume token is valid and contains userId
      // THIS IS A SIMPLIFICATION - USE ACTUAL JWT VERIFICATION LIKE IN AUTH MIDDLEWARE
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()); // Basic decode for demo
      const user = await userRepository.findOneBy({ id: decoded.id });

      if (!user) {
        return next(new CustomError('User not found', 401));
      }
      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (error) {
      Logger.error('Socket authentication error:', error);
      next(new CustomError('Authentication failed', 401));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    Logger.info(`User connected: ${socket.username} (${socket.userId}) - Socket ID: ${socket.id}`);

    if (socket.userId) {
      await RedisService.setUserOnline(socket.userId, socket.id);
      io.emit('user:status', { userId: socket.userId, isOnline: true }); // Notify all users
    }

    // Join all conversations the user is part of
    const userConversations = await conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'participant')
      .where('participant.userId = :userId', { userId: socket.userId })
      .getMany();

    userConversations.forEach(conv => {
      socket.join(`conversation:${conv.id}`);
    });
    Logger.info(`User ${socket.username} joined ${userConversations.length} conversation rooms.`);

    socket.on('message:send', async (data: { conversationId: string; content: string }) => {
      if (!socket.userId) {
        socket.emit('error', 'Authentication required to send messages.');
        return;
      }

      const { conversationId, content } = data;
      if (!conversationId || !content) {
        socket.emit('error', 'Conversation ID and content are required.');
        return;
      }

      try {
        const conversation = await conversationRepository.findOne({
          where: { id: conversationId },
          relations: ['participants'],
        });

        if (!conversation) {
          throw new CustomError('Conversation not found', 404);
        }

        const isSenderParticipant = conversation.participants.some(p => p.userId === socket.userId);
        if (!isSenderParticipant) {
          throw new CustomError('You are not a participant of this conversation.', 403);
        }

        const newMessage = messageRepository.create({
          conversationId,
          senderId: socket.userId,
          content,
        });

        await messageRepository.save(newMessage);

        const savedMessage = await messageRepository.findOne({
          where: { id: newMessage.id },
          relations: ['sender'],
        });

        if (!savedMessage) {
          throw new CustomError('Failed to retrieve saved message', 500);
        }

        // Emit message to all participants in the conversation room
        io.to(`conversation:${conversationId}`).emit('message:receive', savedMessage);
        Logger.info(`Message sent to conversation ${conversationId} by ${socket.username}`);

      } catch (error: any) {
        Logger.error('Error sending message:', error.message);
        socket.emit('error', error.message || 'Failed to send message.');
      }
    });

    socket.on('conversation:join', async (conversationId: string) => {
      if (!socket.userId) return;
      // Re-check if user is allowed to join this conversation
      const isParticipant = await conversationRepository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('participant.userId = :userId', { userId: socket.userId })
        .getOne();

      if (isParticipant) {
        socket.join(`conversation:${conversationId}`);
        Logger.info(`User ${socket.username} explicitly joined conversation ${conversationId}`);
      } else {
        socket.emit('error', 'Unauthorized to join this conversation room.');
      }
    });

    socket.on('disconnect', async () => {
      Logger.info(`User disconnected: ${socket.username} (${socket.userId}) - Socket ID: ${socket.id}`);
      if (socket.userId) {
        await RedisService.removeUserOnline(socket.userId, socket.id);
        const isUserTrulyOffline = !(await RedisService.isUserOnline(socket.userId));
        if (isUserTrulyOffline) {
          io.emit('user:status', { userId: socket.userId, isOnline: false });
        }
      }
    });
  });
};