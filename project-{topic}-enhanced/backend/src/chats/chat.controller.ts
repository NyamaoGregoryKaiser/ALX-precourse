```typescript
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { chatService } from './chat.service';
import { AuthenticatedRequest } from '../types';
import { createChatRoomSchema, joinChatRoomSchema, sendMessageSchema } from '../utils/validators';
import { ZodError } from 'zod';

class ChatController {
  async createChatRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      const validatedData = createChatRoomSchema.parse(req.body);
      const { name, description } = validatedData;
      const chatRoom = await chatService.createChatRoom(name, description, req.user.id);
      res.status(StatusCodes.CREATED).json({ status: 'success', data: { chatRoom } });
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error);
      }
      next(error);
    }
  }

  async getChatRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const chatRoom = await chatService.getChatRoomById(id);
      res.status(StatusCodes.OK).json({ status: 'success', data: { chatRoom } });
    } catch (error) {
      next(error);
    }
  }

  async getUserChatRooms(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      const chatRooms = await chatService.getUserChatRooms(req.user.id);
      res.status(StatusCodes.OK).json({ status: 'success', data: { chatRooms } });
    } catch (error) {
      next(error);
    }
  }

  async joinChatRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      const validatedData = joinChatRoomSchema.parse(req.body);
      const { chatRoomId } = validatedData;
      const chatRoom = await chatService.joinChatRoom(chatRoomId, req.user.id);
      res.status(StatusCodes.OK).json({ status: 'success', message: 'Joined chat room successfully', data: { chatRoom } });
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error);
      }
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      const { id } = req.params; // chatRoomId
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Basic authorization: check if user is part of the chat room
      const chatRoom = await chatService.getChatRoomById(id);
      const isParticipant = chatRoom?.participants.some(p => p.user.id === req.user?.id);
      if (!isParticipant) {
        return res.status(StatusCodes.FORBIDDEN).json({ status: 'fail', message: 'You are not a participant of this chat room.' });
      }

      const messages = await chatService.getMessagesInChatRoom(id, limit, offset);
      res.status(StatusCodes.OK).json({ status: 'success', data: { messages } });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      const { id } = req.params; // chatRoomId
      const validatedData = sendMessageSchema.parse(req.body);
      const { content } = validatedData;

      // This endpoint is primarily for persisting messages. Real-time broadcast happens via Socket.IO.
      const message = await chatService.sendMessage(id, req.user.id, content);

      // In a real scenario, you'd likely broadcast this via Socket.IO from here or a dedicated pub/sub system.
      // For this example, the socket.handler explicitly handles the broadcast.
      res.status(StatusCodes.CREATED).json({ status: 'success', message: 'Message sent and saved', data: { message } });
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error);
      }
      next(error);
    }
  }
}

export const chatController = new ChatController();
```