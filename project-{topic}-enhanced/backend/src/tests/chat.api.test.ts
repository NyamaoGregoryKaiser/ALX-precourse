```typescript
import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import { authService } from '../auth/auth.service';

const prisma = new PrismaClient();

process.env.DATABASE_URL = process.env.DATABASE_TEST_URL || 'postgresql://user:password@localhost:5432/chat_app_test?schema=public';

describe('Chat API Tests', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let chatRoomId: string;

  beforeAll(async () => {
    await prisma.$connect();
    // Clear and seed users for tests
    await prisma.message.deleteMany();
    await prisma.chatRoomParticipant.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.user.deleteMany();

    const user1 = await authService.register('testuser1', 'user1@example.com', 'password123');
    user1Token = user1.token;
    user1Id = user1.user.id;

    const user2 = await authService.register('testuser2', 'user2@example.com', 'password123');
    user2Token = user2.token;
    user2Id = user2.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/chats', () => {
    it('should create a new chat room', async () => {
      const res = await request(app)
        .post('/api/chats')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Test Chat Room', description: 'A room for testing' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.chatRoom).toHaveProperty('id');
      expect(res.body.data.chatRoom.name).toBe('Test Chat Room');
      expect(res.body.data.chatRoom.description).toBe('A room for testing');
      expect(res.body.data.chatRoom.participants).toHaveLength(1);
      expect(res.body.data.chatRoom.participants[0].userId).toBe(user1Id);
      chatRoomId = res.body.data.chatRoom.id;
    });

    it('should return 400 if validation fails', async () => {
      const res = await request(app)
        .post('/api/chats')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: '' }); // Empty name

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Validation Error');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/chats')
        .send({ name: 'Unauthorized Room' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/chats', () => {
    it('should get all chat rooms for the authenticated user', async () => {
      // User1 already created a room
      const res = await request(app)
        .get('/api/chats')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.chatRooms).toHaveLength(1);
      expect(res.body.data.chatRooms[0].id).toBe(chatRoomId);
      expect(res.body.data.chatRooms[0].participants[0].user.id).toBe(user1Id);
    });
  });

  describe('POST /api/chats/join', () => {
    it('should allow a user to join an existing chat room', async () => {
      const res = await request(app)
        .post('/api/chats/join')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ chatRoomId });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Joined chat room successfully');
      expect(res.body.data.chatRoom.id).toBe(chatRoomId);

      // Verify user2 is now a participant
      const chatRoom = await prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: { participants: true }
      });
      expect(chatRoom?.participants).toHaveLength(2);
      expect(chatRoom?.participants.some(p => p.userId === user2Id)).toBe(true);
    });

    it('should return 404 if chat room does not exist', async () => {
      const res = await request(app)
        .post('/api/chats/join')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ chatRoomId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }) }); // invalid UUID

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Chat room not found');
    });
  });

  describe('POST /api/chats/:id/messages', () => {
    it('should send a message to the chat room', async () => {
      const messageContent = 'Hello from user1!';
      const res = await request(app)
        .post(`/api/chats/${chatRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: messageContent });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Message sent and saved');
      expect(res.body.data.message.content).toBe(messageContent);
      expect(res.body.data.message.senderId).toBe(user1Id);
      expect(res.body.data.message.chatRoomId).toBe(chatRoomId);

      // Verify message is in DB
      const dbMessage = await prisma.message.findFirst({ where: { content: messageContent, senderId: user1Id } });
      expect(dbMessage).toBeDefined();
    });

    it('should return 403 if user is not a participant', async () => {
      const { token: user3Token } = await authService.register('testuser3', 'user3@example.com', 'password123');
      const messageContent = 'Hello from non-participant!';

      const res = await request(app)
        .post(`/api/chats/${chatRoomId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ content: messageContent });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You are not a participant of this chat room.');
    });
  });

  describe('GET /api/chats/:id/messages', () => {
    it('should retrieve messages from a chat room', async () => {
      const messageContent2 = 'Another message from user2.';
      await request(app)
        .post(`/api/chats/${chatRoomId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: messageContent2 });

      const res = await request(app)
        .get(`/api/chats/${chatRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`); // User1 is a participant

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.messages).toHaveLength(2); // Initial message + new message
      expect(res.body.data.messages[0].content).toBe('Hello from user1!'); // Ordered by createdAt asc
      expect(res.body.data.messages[1].content).toBe(messageContent2);
    });

    it('should return 403 if user is not a participant when getting messages', async () => {
      const { token: user4Token } = await authService.register('testuser4', 'user4@example.com', 'password123');

      const res = await request(app)
        .get(`/api/chats/${chatRoomId}/messages`)
        .set('Authorization', `Bearer ${user4Token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You are not a participant of this chat room.');
    });
  });
});
```