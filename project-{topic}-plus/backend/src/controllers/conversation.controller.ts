```typescript
import { Request, Response, NextFunction } from 'express';
import { conversationService } from '../services/conversation.service';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';

class ConversationController {
  async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated.');
      }
      const { name, participantIds } = req.body;
      const conversation = await conversationService.createConversation(
        req.user.id,
        participantIds,
        name
      );
      res.status(httpStatus.CREATED).json({
        message: 'Conversation created successfully',
        conversation: {
          id: conversation.id,
          name: conversation.name,
          isGroup: conversation.isGroup,
          createdAt: conversation.createdAt,
          participants: conversation.participants.map(p => ({
            id: p.userId,
            username: p.user.username,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated.');
      }
      const conversations = await conversationService.getConversationsByUserId(req.user.id);
      res.status(httpStatus.OK).json(conversations.map(conv => ({
        id: conv.id,
        name: conv.name,
        isGroup: conv.isGroup,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastMessage: conv.lastMessage ? {
          id: conv.lastMessage.id,
          senderId: conv.lastMessage.senderId,
          content: conv.lastMessage.content,
          createdAt: conv.lastMessage.createdAt,
        } : null,
        participants: conv.participants.map(p => ({
          id: p.userId,
          username: p.user.username,
          status: p.user.status,
        })),
      })));
    } catch (error) {
      next(error);
    }
  }

  async getConversationById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated.');
      }
      const { conversationId } = req.params;
      const conversation = await conversationService.getConversationById(conversationId, req.user.id);

      if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found or user is not a participant.');
      }

      res.status(httpStatus.OK).json({
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map(p => ({
          id: p.userId,
          username: p.user.username,
          status: p.user.status,
        })),
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          content: msg.content,
          createdAt: msg.createdAt,
          sender: {
            id: msg.sender.id,
            username: msg.sender.username,
          },
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const conversationController = new ConversationController();
```