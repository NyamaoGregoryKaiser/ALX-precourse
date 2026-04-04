```typescript
import prisma from '../prisma';
import { Message } from '@prisma/client';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';
import { conversationService } from './conversation.service';
import { logger } from '../config/winston';

class MessageService {
  async createMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const isParticipant = await conversationService.isUserInConversation(senderId, conversationId);
    if (!isParticipant) {
      logger.warn(`User ${senderId} attempted to send message to conversation ${conversationId} without permission.`);
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation.');
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
    });

    // Update the conversation's last message and updatedAt field
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    });

    logger.info(`Message sent by ${senderId} to conversation ${conversationId}`);
    return message;
  }

  async getMessagesInConversation(conversationId: string, userId: string): Promise<
    (Message & { sender: { id: string; username: string } })[]
  > {
    const isParticipant = await conversationService.isUserInConversation(userId, conversationId);
    if (!isParticipant) {
      logger.warn(`User ${userId} attempted to retrieve messages from conversation ${conversationId} without permission.`);
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation.');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, username: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100, // Limit message fetching for performance
    });

    return messages;
  }
}

export const messageService = new MessageService();
```