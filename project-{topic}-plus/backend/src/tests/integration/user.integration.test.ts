```typescript
import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import httpStatus from 'http-status';
import { jwtService } from '../../services/jwt.service';
import { UserStatus } from '@prisma/client';

// Mock prisma and jwtService for isolation.
jest.mock('../../prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(() => []),
  },
}));

jest.mock('../../services/jwt.service', () => ({
  jwtService: {
    generateToken: jest.fn(),
    verifyToken: jest.fn(), // Mock verifyToken for authentication middleware
  },
}));

describe('User API Integration Tests', () => {
  const mockUser = {
    id: 'user-uuid-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: UserStatus.ONLINE
  };
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    // Reset mocks before each test
    (prisma.user.findUnique as jest.Mock).mockReset();
    (prisma.user.findMany as jest.Mock).mockReset();
    (jwtService.verifyToken as jest.Mock).mockReset();

    // Default successful authentication mock
    (jwtService.verifyToken as jest.Mock).mockReturnValue({ userId: mockUser.id });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('GET /api/users/me', () => {
    it('should return the authenticated user\'s profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('id', mockUser.id);
      expect(res.body).toHaveProperty('username', mockUser.username);
      expect(res.body).toHaveProperty('email', mockUser.email);
      expect(res.body).toHaveProperty('status', mockUser.status);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUser.id } });
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .expect(httpStatus.UNAUTHORIZED);

      expect(res.body.message).toContain('Authentication required');
    });

    it('should return 403 if token is invalid', async () => {
      (jwtService.verifyToken as jest.Mock).mockReturnValue(null); // Invalid token

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer invalid-token`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toContain('Invalid token');
    });

    it('should return 401 if user not found for valid token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // User not found

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.UNAUTHORIZED);

      expect(res.body.message).toContain('Authentication failed: User not found');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a user\'s profile by ID', async () => {
      const targetUser = {
        ...mockUser,
        id: 'user-uuid-2',
        username: 'otheruser',
        email: 'other@example.com'
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(targetUser);

      const res = await request(app)
        .get(`/api/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('id', targetUser.id);
      expect(res.body).toHaveProperty('username', targetUser.username);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: targetUser.id } });
    });

    it('should return 404 if user ID not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/non-existent-uuid')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.NOT_FOUND);

      expect(res.body.message).toContain('User not found');
    });

    it('should return 400 if ID is not a valid UUID', async () => {
      const res = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('must be a valid UUID');
    });
  });

  describe('GET /api/users/search', () => {
    it('should return a list of users matching the search query', async () => {
      const searchResults = [
        { id: 'user-uuid-2', username: 'searchmatch', email: 'searchmatch@example.com', status: UserStatus.OFFLINE },
        { id: 'user-uuid-3', username: 'anothermatch', email: 'anothermatch@example.com', status: UserStatus.ONLINE },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(searchResults);

      const res = await request(app)
        .get('/api/users/search?q=match')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('username', 'searchmatch');
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: expect.any(Array) },
        select: { id: true, username: true, email: true, status: true },
        take: 10,
      }));
    });

    it('should return 400 if search query "q" is missing', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('"q" is required');
    });

    it('should return an empty array if no users match', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/users/search?q=nomatch')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toEqual([]);
    });
  });
});
```