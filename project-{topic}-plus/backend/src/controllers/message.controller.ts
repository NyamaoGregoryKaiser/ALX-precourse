```typescript
import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';
import { io } from '../sockets'; // Import the Socket.IO instance

class MessageController {
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated.');
      }
      const { conversationId } = req.params;
      const { content } = req.body;

      const message = await messageService.createMessage(conversationId, req.user.id, content);

      // Emit message to connected clients via Socket.IO
      io.to(conversationId).emit('receive_message', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        sender: {
          id: req.user.id,
          username: req.user.username,
        },
        content: message.content,
        createdAt: message.createdAt,
      });

      res.status(httpStatus.CREATED).json({
        message: 'Message sent successfully',
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated.');
      }
      const { conversationId } = req.params;

      const messages = await messageService.getMessagesInConversation(conversationId, req.user.id);

      res.status(httpStatus.OK).json(messages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: {
          id: msg.sender.id,
          username: msg.sender.username,
        },
      })));
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
```