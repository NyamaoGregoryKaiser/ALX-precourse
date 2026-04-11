```typescript
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/database/prisma/client';
import bcrypt from 'bcryptjs';
import { User, Role } from '@prisma/client';
import { redisClient } from '../../src/utils/redisClient'; // Import redis client

let testUser: User;
const userPassword = 'password123';

beforeAll(async () => {
  // Clear the database
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create a user for login tests
  const hashedPassword = await bcrypt.hash(userPassword, 12);
  testUser = await prisma.user.create({
    data: {
      email: 'login@test.com',
      password: hashedPassword,
      name: 'Login User',
      role: Role.USER,
    },
  });

  // Clear Redis cache before API tests
  await redisClient.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'newpassword123',
          name: 'New User',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe('newuser@test.com');
      expect(res.body.data.user).not.toHaveProperty('password'); // Password should be excluded
    });

    it('should return 409 if email already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com', // Already registered
          password: 'anotherpassword',
          name: 'Duplicate User',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid registration data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email', // Invalid email
          password: 'short', // Too short password
          name: '', // Empty name
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Email must be a valid email address.');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in an existing user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: userPassword,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid credentials (user not found)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'somepassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid login data', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'anypassword',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Email must be a valid email address.');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return authenticated user details', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: userPassword,
        });
      const token = loginRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.statusCode).toEqual(200);
      expect(meRes.body.status).toBe('success');
      expect(meRes.body.data.user.id).toBe(testUser.id);
      expect(meRes.body.data.user.email).toBe(testUser.email);
      expect(meRes.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
    });

    it('should return 401 for an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Invalid token. Please log in again!');
    });

    it('should return 401 for an expired token', async () => {
      const expiredToken = jwt.sign({ id: testUser.id, role: testUser.role }, config.jwtSecret, { expiresIn: '1ms' });
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Your token has expired! Please log in again.');
    });
  });
});
```

### Frontend Testing (Jest, React Testing Library)

**`frontend/jest.config.cjs` (at `frontend/` root):**
```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        transform: {
          react: {
            runtime: 'automatic'
          }
        }
      }
    }],
    '^.+\\.css$': '<rootDir>/jest-css-transform.cjs' // For CSS imports
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/fileTransformer.cjs', // Mock image imports
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/main.tsx', // Entry point usually not tested
    '/src/App.tsx', // High-level component, covered by integration tests
    '/src/api/apiClient.ts', // Axios config, covered by API tests (backend)
    '/src/contexts/AuthContext.tsx', // Context logic, tested via hooks
    '/src/hooks/useAuth.ts',
    '/src/pages/', // Pages are typically integration tested or tested through components
  ],
  testMatch: ['<rootDir>/src/**/*.test.tsx', '<rootDir>/src/**/*.test.ts'],
};
```
**`frontend/jest-css-transform.cjs`:**
```javascript
// jest-css-transform.cjs
module.exports = {
  process() {
    return 'module.exports = {};';
  },
  getCacheKey() {
    return 'cssTransform';
  },
};
```
**`frontend/fileTransformer.cjs`:**
```javascript
// fileTransformer.cjs
const path = require('path');

module.exports = {
  process(src, filename, config, options) {
    return `module.exports = ${JSON.stringify(path.basename(filename))};`;
  },
};
```

**`frontend/src/setupTests.ts`:**
```typescript
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'whatwg-fetch'; // Polyfill fetch for Jest environment

// Mock localStorage
const localStorageMock = (function () {
  let store: { [key: string]: string } = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
  ToastContainer: () => <div />, // Mock the component
}));

// Mock axios client if needed for pure component tests not involving actual API calls
jest.mock('../api/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}));
```