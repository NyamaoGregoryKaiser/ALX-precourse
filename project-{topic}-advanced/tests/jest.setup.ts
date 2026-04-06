```typescript
// tests/jest.setup.ts
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config/jwt';
import { UserRole } from '@prisma/client';

beforeAll(async () => {
  // Clear the database before all tests
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Seed test data
  const hashedPassword = await bcrypt.hash('testpassword', 10);
  const adminPassword = await bcrypt.hash('adminpassword', 10);

  await prisma.user.create({
    data: {
      id: 'test-user-id-1',
      email: 'test1@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User1',
      role: UserRole.USER,
      accounts: {
        create: {
          id: 'test-account-id-1',
          accountNumber: '1111111111',
          balance: 1000.00,
          currency: 'USD',
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: 'test-user-id-2',
      email: 'test2@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User2',
      role: UserRole.USER,
      accounts: {
        create: {
          id: 'test-account-id-2',
          accountNumber: '2222222222',
          balance: 500.00,
          currency: 'USD',
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: 'admin-user-id',
      email: 'admin@test.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Test',
      role: UserRole.ADMIN,
      accounts: {
        create: {
          id: 'admin-account-id',
          accountNumber: '9999999999',
          balance: 5000.00,
          currency: 'USD',
        },
      },
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Helper function to generate a valid token for tests
export const generateTestToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
};
```