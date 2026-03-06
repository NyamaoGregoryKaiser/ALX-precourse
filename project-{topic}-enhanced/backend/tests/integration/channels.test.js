```javascript
import request from 'supertest';
import app from '../../src/app';
import httpStatus from 'http-status';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../src/config';
import cache from '../../src/utils/cache';

const prisma = new PrismaClient();

describe('Channel routes', () => {
  let user1, user2;
  let user1AccessToken, user2AccessToken;

  beforeEach(async () => {
    // Create users for testing
    const hashedPassword = await bcrypt.hash('password123', 10);
    user1 = await prisma.user.create({
      data: {
        username: 'channeltestuser1',
        email: 'channeltest1@example.com',
        passwordHash: hashedPassword,
      },
    });
    user2 = await prisma.user.create({
      data: {
        username: 'channeltestuser2',
        email: 'channeltest2@example.com',
        passwordHash: hashedPassword,
      },
    });

    // Generate access tokens
    user1AccessToken = jwt.sign({ sub: user1.id, type: 'access' }, config.jwt.secret, {
      expiresIn: `${config.jwt.accessExpirationMinutes}m`,
    });
    user2AccessToken = jwt.sign({ sub: user2.id, type: 'access' }, config.jwt.secret, {
      expiresIn: `${config.jwt.accessExpirationMinutes}m`,
    });

    // Clear cache before each test
    await cache.getClient().flushdb();
  });

  afterEach(async () => {
    // Clean up all related data
    await prisma.message.deleteMany({});
    await prisma.channelUser.deleteMany({});
    await prisma.channel.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['channeltest1@example.com', 'channeltest2@example.com', 'testchannel@example.com'],
        },
      },
    });
    await cache.getClient().flushdb();
  });

  describe('POST /api/channels', () => {
    test('should return 201 and create a new channel if authorized', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          name: 'testchannel',
          description: 'A channel for integration tests',
        })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'testchannel');
      expect(res.body).toHaveProperty('ownerId', user1.id);

      const channelInDb = await prisma.channel.findUnique({ where: { name: 'testchannel' } });
      expect(channelInDb).toBeDefined();
      expect(channelInDb.ownerId).toBe(user1.id);

      // Verify owner is automatically added to channel users
      const channelUserInDb = await prisma.channelUser.findUnique({
        where: { channelId_userId: { channelId: channelInDb.id, userId: user1.id } },
      });
      expect(channelUserInDb).toBeDefined();
    });

    test('should return 401 if not authenticated', async () => {
      await request(app)
        .post('/api/channels')
        .send({ name: 'unauth-channel' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 400 if channel name is missing', async () => {
      await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({ description: 'No name' })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if channel name is already taken', async () => {
      await prisma.channel.create({
        data: { id: 'existing-channel-id', name: 'existing-channel', ownerId: user1.id },
      });

      await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({ name: 'existing-channel' })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/channels', () => {
    let channel1, channel2;
    beforeEach(async () => {
      channel1 = await prisma.channel.create({
        data: { id: 'channel1-id', name: 'general', ownerId: user1.id },
      });
      channel2 = await prisma.channel.create({
        data: { id: 'channel2-id', name: 'random', ownerId: user2.id },
      });
    });

    test('should return 200 and all channels if authorized', async () => {
      const res = await request(app)
        .get('/api/channels')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      expect(res.body[0].name).toBe('general');
      expect(res.body[1].name).toBe('random');
    });

    test('should return 401 if not authenticated', async () => {
      await request(app).get('/api/channels').expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/channels/:channelId', () => {
    let channel;
    beforeEach(async () => {
      channel = await prisma.channel.create({
        data: { id: 'specific-channel-id', name: 'specific', ownerId: user1.id },
      });
    });

    test('should return 200 and the channel if authorized and found', async () => {
      const res = await request(app)
        .get(`/api/channels/${channel.id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('id', channel.id);
      expect(res.body).toHaveProperty('name', channel.name);
    });

    test('should return 404 if channel not found', async () => {
      await request(app)
        .get('/api/channels/nonexistent-id')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('POST /api/channels/:channelId/join', () => {
    let channel;
    beforeEach(async () => {
      channel = await prisma.channel.create({
        data: { id: 'joinable-channel-id', name: 'joinable', ownerId: user1.id },
      });
    });

    test('should return 200 and add user to channel', async () => {
      const res = await request(app)
        .post(`/api/channels/${channel.id}/join`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.message).toBe('User successfully joined channel');
      const channelUserInDb = await prisma.channelUser.findUnique({
        where: { channelId_userId: { channelId: channel.id, userId: user2.id } },
      });
      expect(channelUserInDb).toBeDefined();
    });

    test('should return 400 if user is already a member', async () => {
      await prisma.channelUser.create({
        data: { channelId: channel.id, userId: user2.id },
      });

      await request(app)
        .post(`/api/channels/${channel.id}/join`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 404 if channel not found', async () => {
      await request(app)
        .post('/api/channels/nonexistent-id/join')
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('POST /api/channels/:channelId/leave', () => {
    let channel;
    beforeEach(async () => {
      channel = await prisma.channel.create({
        data: { id: 'leaveable-channel-id', name: 'leaveable', ownerId: user1.id },
      });
      await prisma.channelUser.create({
        data: { channelId: channel.id, userId: user2.id },
      });
    });

    test('should return 200 and remove user from channel', async () => {
      const res = await request(app)
        .post(`/api/channels/${channel.id}/leave`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.message).toBe('User successfully left channel');
      const channelUserInDb = await prisma.channelUser.findUnique({
        where: { channelId_userId: { channelId: channel.id, userId: user2.id } },
      });
      expect(channelUserInDb).toBeNull();
    });

    test('should return 400 if user is not a member', async () => {
      await prisma.channelUser.delete({
        where: { channelId_userId: { channelId: channel.id, userId: user2.id } },
      }); // Remove before test

      await request(app)
        .post(`/api/channels/${channel.id}/leave`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/channels/:channelId/members', () => {
    let channel;
    beforeEach(async () => {
      channel = await prisma.channel.create({
        data: { id: 'members-channel-id', name: 'members', ownerId: user1.id },
      });
      await prisma.channelUser.create({
        data: { channelId: channel.id, userId: user1.id },
      });
      await prisma.channelUser.create({
        data: { channelId: channel.id, userId: user2.id },
      });
    });

    test('should return 200 and channel members if authorized and member', async () => {
      const res = await request(app)
        .get(`/api/channels/${channel.id}/members`)
        .set('Authorization', `Bearer ${user1AccessToken}`) // user1 is a member
        .expect(httpStatus.OK);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      expect(res.body.some((member) => member.id === user1.id)).toBe(true);
      expect(res.body.some((member) => member.id === user2.id)).toBe(true);
    });

    test('should return 403 if user is not a member', async () => {
      const newUser = await prisma.user.create({
        data: { username: 'outsider', email: 'outsider@test.com', passwordHash: await bcrypt.hash('password123', 10) },
      });
      const outsiderAccessToken = jwt.sign({ sub: newUser.id, type: 'access' }, config.jwt.secret, {
        expiresIn: `${config.jwt.accessExpirationMinutes}m`,
      });

      await request(app)
        .get(`/api/channels/${channel.id}/members`)
        .set('Authorization', `Bearer ${outsiderAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('DELETE /api/channels/:channelId', () => {
    let channel;
    beforeEach(async () => {
      channel = await prisma.channel.create({
        data: { id: 'deletable-channel-id', name: 'deletable', ownerId: user1.id },
      });
      await prisma.channelUser.create({
        data: { channelId: channel.id, userId: user1.id },
      });
    });

    test('should return 204 and delete channel if owner', async () => {
      await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const channelInDb = await prisma.channel.findUnique({ where: { id: channel.id } });
      expect(channelInDb).toBeNull();

      // Ensure channel users are also deleted (cascade)
      const channelUsersInDb = await prisma.channelUser.findMany({ where: { channelId: channel.id } });
      expect(channelUsersInDb.length).toBe(0);
    });

    test('should return 403 if not channel owner', async () => {
      await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set('Authorization', `Bearer ${user2AccessToken}`) // user2 is not owner
        .expect(httpStatus.FORBIDDEN);

      const channelInDb = await prisma.channel.findUnique({ where: { id: channel.id } });
      expect(channelInDb).toBeDefined(); // Channel should still exist
    });

    test('should return 404 if channel not found', async () => {
      await request(app)
        .delete('/api/channels/nonexistent-id')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
```

**API Tests (Part of Integration tests with Supertest)**
The integration tests (`auth.test.js`, `channels.test.js`) cover CRUD operations and expected API responses, thus serving as API tests.

### Frontend Tests (React Testing Library, Jest)