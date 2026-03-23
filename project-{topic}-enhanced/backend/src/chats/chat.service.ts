```typescript
import { PrismaClient, ChatRoom, Message, User } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const prisma = new PrismaClient();

class ChatService {
  async createChatRoom(name: string, description: string | undefined, creatorId: string): Promise<ChatRoom> {
    const newChatRoom = await prisma.chatRoom.create({
      data: {
        name,
        description,
        participants: {
          create: {
            userId: creatorId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, email: true }
            }
          }
        }
      }
    });
    logger.info(`Chat room created: ${newChatRoom.name} by user ${creatorId}`);
    return newChatRoom;
  }

  async getChatRoomById(roomId: string): Promise<ChatRoom | null> {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, email: true } } }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, username: true, email: true } } },
          take: 50 // Limit initial message load
        }
      }
    });

    if (!chatRoom) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Chat room not found');
    }
    return chatRoom;
  }

  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, email: true } } }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get last message for preview
          include: { sender: { select: { id: true, username: true } } }
        }
      },
      orderBy: {
        updatedAt: 'desc' // Order by most recent activity
      }
    });
    return chatRooms;
  }

  async joinChatRoom(roomId: string, userId: string): Promise<ChatRoom> {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true
      }
    });

    if (!chatRoom) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Chat room not found');
    }

    const isAlreadyParticipant = chatRoom.participants.some(p => p.userId === userId);
    if (isAlreadyParticipant) {
      return chatRoom; // Already a participant, no op
    }

    await prisma.chatRoomParticipant.create({
      data: {
        chatRoomId: roomId,
        userId: userId,
      },
    });

    // Update chat room's updatedAt to reflect recent activity
    const updatedChatRoom = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, email: true } } }
        }
      }
    });

    logger.info(`User ${userId} joined chat room ${roomId}`);
    return updatedChatRoom;
  }

  async sendMessage(chatRoomId: string, senderId: string, content: string): Promise<Message> {
    // Check if user is a participant of the chat room
    const participant = await prisma.chatRoomParticipant.findUnique({
      where: {
        userId_chatRoomId: {
          userId: senderId,
          chatRoomId: chatRoomId,
        },
      },
    });

    if (!participant) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant of this chat room.');
    }

    const newMessage = await prisma.message.create({
      data: {
        content,
        chatRoomId,
        senderId,
      },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    // Update the chat room's updatedAt to bring it to the top of user's chat list
    await prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { updatedAt: new Date() },
    });

    logger.debug(`Message sent in room ${chatRoomId} by ${senderId}`);
    return newMessage;
  }

  async getMessagesInChatRoom(chatRoomId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const messages = await prisma.message.findMany({
      where: { chatRoomId },
      orderBy: { createdAt: 'desc' }, // Fetch newest first for pagination
      take: limit,
      skip: offset,
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
    });
    // Reverse to get oldest first for display in chat UI
    return messages.reverse();
  }
}

export const chatService = new ChatService();
```