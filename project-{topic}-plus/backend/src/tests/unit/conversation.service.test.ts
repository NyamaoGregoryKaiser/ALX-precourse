```typescript
import { conversationService } from '../../services/conversation.service';
import prisma from '../../prisma';
import { ApiError } from '../../middlewares/errorHandler';
import httpStatus from 'http-status';
import { Conversation, User, UserStatus } from '@prisma/client';

jest.mock('../../prisma', () => ({
  user: {
    findUnique: jest.fn(),
  },
  conversation: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  conversationParticipant: {
    findUnique: jest.fn(),
  },
}));

const mockUser1: User = {
  id: 'user1-uuid', username: 'user1', email: 'user1@example.com', passwordHash: 'hash1', createdAt: new Date(), updatedAt: new Date(), status: UserStatus.ONLINE,
};
const mockUser2: User = {
  id: 'user2-uuid', username: 'user2', email: 'user2@example.com', passwordHash: 'hash2', createdAt: new Date(), updatedAt: new Date(), status: UserStatus.OFFLINE,
};
const mockUser3: User = {
  id: 'user3-uuid', username: 'user3', email: 'user3@example.com', passwordHash: 'hash3', createdAt: new Date(), updatedAt: new Date(), status: UserStatus.AWAY,
};

const mockDMConversation: Conversation = {
  id: 'dm-conv-uuid', name: null, isGroup: false, createdAt: new Date(), updatedAt: new Date(), lastMessageId: null
};

const mockGroupConversation: Conversation = {
  id: 'group-conv-uuid', name: 'Test Group', isGroup: true, createdAt: new Date(), updatedAt: new Date(), lastMessageId: null
};

describe('ConversationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a direct message conversation successfully', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null); // No existing DM
      (prisma.conversation.create as jest.Mock).mockResolvedValue({
        ...mockDMConversation,
        participants: [
          { userId: mockUser1.id, user: { username: mockUser1.username } },
          { userId: mockUser2.id, user: { username: mockUser2.username } },
        ],
      });

      const conversation = await conversationService.createConversation(
        mockUser1.id,
        [mockUser2.id]
      );

      expect(prisma.conversation.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          name: null,
          isGroup: false,
          participants: {
            create: [{ userId: mockUser1.id }, { userId: mockUser2.id }],
          },
        },
        include: expect.any(Object),
      });
      expect(conversation.isGroup).toBe(false);
      expect(conversation.participants.length).toBe(2);
    });

    it('should return existing direct message conversation if already present', async () => {
      const existingDM = {
        ...mockDMConversation,
        participants: [
          { userId: mockUser1.id, user: { username: mockUser1.username } },
          { userId: mockUser2.id, user: { username: mockUser2.username } },
        ],
      };
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(existingDM);

      const conversation = await conversationService.createConversation(
        mockUser1.id,
        [mockUser2.id]
      );

      expect(prisma.conversation.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(conversation).toEqual(existingDM);
    });

    it('should create a group conversation successfully', async () => {
      (prisma.conversation.create as jest.Mock).mockResolvedValue({
        ...mockGroupConversation,
        participants: [
          { userId: mockUser1.id, user: { username: mockUser1.username } },
          { userId: mockUser2.id, user: { username: mockUser2.username } },
          { userId: mockUser3.id, user: { username: mockUser3.username } },
        ],
      });

      const conversation = await conversationService.createConversation(
        mockUser1.id,
        [mockUser2.id, mockUser3.id],
        'New Group'
      );

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          name: 'New Group',
          isGroup: true,
          participants: {
            create: [{ userId: mockUser1.id }, { userId: mockUser2.id }, { userId: mockUser3.id }],
          },
        },
        include: expect.any(Object),
      });
      expect(conversation.isGroup).toBe(true);
      expect(conversation.name).toBe('New Group');
      expect(conversation.participants.length).toBe(3);
    });

    it('should throw ApiError if less than two participants', async () => {
      await expect(conversationService.createConversation(mockUser1.id, []))
        .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'A conversation must have at least two participants.'));
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should throw ApiError for invalid participant IDs', async () => {
      // Mocking a Prisma foreign key error
      const prismaError = new Error('Foreign key constraint failed') as any;
      prismaError.code = 'P2003';
      (prisma.conversation.create as jest.Mock).mockRejectedValue(prismaError);

      await expect(conversationService.createConversation(mockUser1.id, ['invalid-uuid']))
        .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'One or more participant IDs are invalid.'));
    });
  });

  describe('getConversationsByUserId', () => {
    it('should return conversations for a user', async () => {
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockDMConversation,
          participants: [
            { userId: mockUser1.id, user: mockUser1 },
            { userId: mockUser2.id, user: mockUser2 },
          ],
          lastMessage: { id: 'msg1', senderId: mockUser1.id, content: 'hi', createdAt: new Date() },
        },
      ]);

      const conversations = await conversationService.getConversationsByUserId(mockUser1.id);

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { participants: { some: { userId: mockUser1.id } } },
        include: expect.any(Object),
      }));
      expect(conversations.length).toBe(1);
      expect(conversations[0].participants[0].user.username).toBe(mockUser1.username);
    });
  });

  describe('getConversationById', () => {
    it('should return a conversation with messages if user is a participant', async () => {
      const convWithMessages = {
        ...mockGroupConversation,
        participants: [
          { userId: mockUser1.id, user: mockUser1 },
          { userId: mockUser2.id, user: mockUser2 },
        ],
        messages: [
          { id: 'msg1', senderId: mockUser1.id, content: 'Hello', sender: { id: mockUser1.id, username: mockUser1.username }, createdAt: new Date() },
        ],
      };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convWithMessages);

      const conversation = await conversationService.getConversationById(mockGroupConversation.id, mockUser1.id);

      expect(prisma.conversation.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: mockGroupConversation.id },
        include: expect.any(Object),
      }));
      expect(conversation).toEqual(convWithMessages);
    });

    it('should throw ApiError if user is not a participant', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroupConversation,
        participants: [
          { userId: mockUser1.id, user: mockUser1 },
        ],
      });

      await expect(conversationService.getConversationById(mockGroupConversation.id, mockUser2.id))
        .rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation.'));
    });

    it('should return null if conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const conversation = await conversationService.getConversationById('non-existent-id', mockUser1.id);
      expect(conversation).toBeNull();
    });
  });

  describe('isUserInConversation', () => {
    it('should return true if user is a participant', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({ userId: mockUser1.id, conversationId: mockDMConversation.id });

      const isParticipant = await conversationService.isUserInConversation(mockUser1.id, mockDMConversation.id);
      expect(isParticipant).toBe(true);
    });

    it('should return false if user is not a participant', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      const isParticipant = await conversationService.isUserInConversation(mockUser3.id, mockDMConversation.id);
      expect(isParticipant).toBe(false);
    });
  });
});
```