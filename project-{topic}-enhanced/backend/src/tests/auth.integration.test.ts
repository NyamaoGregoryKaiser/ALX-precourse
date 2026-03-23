```typescript
import { PrismaClient } from '@prisma/client';
import { authService } from '../auth/auth.service';
import { ApiError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Use a separate test database or mock Prisma for true unit tests
// For integration, we'll clear and use a dedicated test schema/database
// Ensure your DATABASE_URL in .env.test points to a test database!
process.env.DATABASE_URL = process.env.DATABASE_TEST_URL || 'postgresql://user:password@localhost:5432/chat_app_test?schema=public';

describe('Auth Service Integration Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
    // Ensure the database schema is up-to-date for testing
    // In a real CI/CD, this would be `npx prisma migrate deploy`
    // For Jest setup, you might run `npx prisma migrate reset --force` or similar.
  });

  afterEach(async () => {
    // Clean up database after each test
    await prisma.message.deleteMany();
    await prisma.chatRoomParticipant.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register a new user successfully', async () => {
    const username = 'testuser';
    const email = 'test@example.com';
    const password = 'password123';

    const { user, token } = await authService.register(username, email, password);

    expect(user).toBeDefined();
    expect(user.username).toBe(username);
    expect(user.email).toBe(email);
    expect(token).toBeDefined();

    const hashedPassword = await bcrypt.hash(password, 10);
    expect(await bcrypt.compare(password, user.password)).toBe(true); // Check if password is hashed correctly

    const foundUser = await prisma.user.findUnique({ where: { email } });
    expect(foundUser).toBeDefined();
    expect(foundUser?.username).toBe(username);
  });

  it('should throw an error if registering with an existing email', async () => {
    await authService.register('existinguser', 'existing@example.com', 'password123');

    await expect(authService.register('anotheruser', 'existing@example.com', 'password456'))
      .rejects
      .toThrow(new ApiError(StatusCodes.BAD_REQUEST, 'User with this email or username already exists'));
  });

  it('should log in an existing user successfully', async () => {
    const username = 'loginuser';
    const email = 'login@example.com';
    const password = 'loginpassword';
    await authService.register(username, email, password);

    const { user, token } = await authService.login(email, password);

    expect(user).toBeDefined();
    expect(user.username).toBe(username);
    expect(token).toBeDefined();
  });

  it('should throw an error for invalid login credentials', async () => {
    const email = 'invalid@example.com';
    const password = 'wrongpassword';

    await expect(authService.login(email, password))
      .rejects
      .toThrow(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials'));

    await authService.register('validuser', 'valid@example.com', 'validpassword');
    await expect(authService.login('valid@example.com', 'wrongpassword'))
      .rejects
      .toThrow(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials'));
  });

  it('should generate a valid JWT token', async () => {
    const username = 'tokentest';
    const email = 'token@example.com';
    const password = 'password123';
    const { user, token } = await authService.register(username, email, password);

    const decoded = await authService.validateToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.id).toBe(user.id);
    expect(decoded.email).toBe(user.email);
  });

  it('should invalidate token on logout', async () => {
    const { user, token } = await authService.register('logoutuser', 'logout@example.com', 'password123');
    expect(await authService.validateToken(token)).toBeDefined(); // Should be valid initially

    await authService.logout(user.id);

    await expect(authService.validateToken(token))
      .rejects
      .toThrow(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired session'));
  });
});
```