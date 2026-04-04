```typescript
import prisma from '../prisma';
import { Conversation, Prisma, User } from '@prisma/client';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../config/winston';

class ConversationService {
  async createConversation(
    creatorId: string,
    participantIds: string[],
    name?: string
  ): Promise<
    Conversation & {
      participants: { userId: string; user: { username: string } }[];
    }
  > {
    // Ensure creator is included and remove duplicates
    const allParticipantIds = Array.from(new Set([...participantIds, creatorId]));

    if (allParticipantIds.length < 2) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'A conversation must have at least two participants.');
    }

    const isGroup = allParticipantIds.length > 2 || name !== undefined;

    // Check if a direct message conversation already exists for these two users
    if (!isGroup) {
      const [user1Id, user2Id] = allParticipantIds.sort(); // Consistent ordering
      const existingDM = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: user1Id } } },
            { participants: { some: { userId: user2Id } } },
          ],
        },
        include: {
          participants: {
            select: {
              userId: true,
              user: { select: { username: true } },
            },
          },
        },
      });

      if (existingDM) {
        logger.info(`Existing DM found for ${user1Id} and ${user2Id}`);
        return existingDM;
      }
    }

    try {
      const conversation = await prisma.conversation.create({
        data: {
          name: isGroup ? name : null,
          isGroup: isGroup,
          participants: {
            create: allParticipantIds.map((userId) => ({
              userId: userId,
            })),
          },
        },
        include: {
          participants: {
            select: {
              userId: true,
              user: { select: { username: true } },
            },
          },
        },
      });

      logger.info(`Conversation created (ID: ${conversation.id}, Group: ${conversation.isGroup})`);
      return conversation;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'One or more participant IDs are invalid.');
      }
      logger.error(`Error creating conversation: ${error}`);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create conversation');
    }
  }

  async getConversationsByUserId(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: userId },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
            user: { select: { id: true, username: true, status: true } },
          },
        },
        lastMessage: { // Efficiently get last message
          select: {
            id: true,
            senderId: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // Order by last activity
      },
    });

    return conversations.map(conv => ({
      ...conv,
      participants: conv.participants.map(p => ({
        userId: p.user.id,
        user: {
          id: p.user.id,
          username: p.user.username,
          status: p.user.status,
        },
      })),
    }));
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          select: {
            userId: true,
            user: { select: { id: true, username: true, status: true } },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc', // Oldest first
          },
          include: {
            sender: {
              select: { id: true, username: true },
            },
          },
          take: 50, // Limit initial message load
        },
      },
    });

    if (!conversation) {
      return null;
    }

    // Check if the requesting user is a participant
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      logger.warn(`User ${userId} attempted to access conversation ${conversationId} without permission.`);
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation.');
    }

    return conversation;
  }

  async isUserInConversation(userId: string, conversationId: string): Promise<boolean> {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });
    return !!participant;
  }
}

export const conversationService = new ConversationService();
```