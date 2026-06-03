```typescript
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/database/prisma-client';
import { AppError, HttpCode } from '../../src/utils/app-error';
import { hashPassword } from '../../src/utils/password-hasher';
import { env } from '../../src/config/env';
import jwt from 'jsonwebtoken';

describe('Auth E2E Tests', () => {
  const registerPayload = {
    name: 'Test User',
    email: 'test.e2e@example.com',
    password: 'Password123!',
  };

  const loginPayload = {
    email: registerPayload.email,
    password: registerPayload.password,
  };

  afterEach(async () => {
    // Clean up specific user created by tests
    await prisma.user.deleteMany({ where: { email: registerPayload.email } });
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(HttpCode.CREATED);

    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('User registered successfully');
    expect(res.body.data.user.email).toBe(registerPayload.email);
    expect(res.body.data.accessToken).toBeDefined();

    const userInDb = await prisma.user.findUnique({ where: { email: registerPayload.email } });
    expect(userInDb).toBeDefined();
    expect(userInDb?.name).toBe(registerPayload.name);
    // Password should be hashed, not plain text
    expect(userInDb?.password).not.toBe(registerPayload.password);
  });

  it('should not register a user with an existing email', async () => {
    // First register
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(HttpCode.CREATED);

    // Then try to register again with the same email
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(HttpCode.CONFLICT);

    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('User with this email already exists');
  });

  it('should log in a user successfully and return an access token', async () => {
    // First register the user
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(HttpCode.CREATED);

    // Then log in
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(loginPayload)
      .expect(HttpCode.OK);

    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Logged in successfully');
    expect(res.body.data.user.email).toBe(loginPayload.email);
    expect(res.body.data.accessToken).toBeDefined();
    // Check for httpOnly refresh token cookie
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('jid=');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('should not log in with incorrect credentials', async () => {
    // Register a user
    await request(app).post('/api/v1/auth/register').send(registerPayload);

    // Try to log in with incorrect password
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: loginPayload.email, password: 'wrongpassword' })
      .expect(HttpCode.UNAUTHORIZED);

    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Incorrect email or password');
  });

  it('should log out a user by clearing the refresh token cookie', async () => {
    // First, login to get the cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(loginPayload)
      .expect(HttpCode.OK);

    const cookie = loginRes.headers['set-cookie'];

    // Then, logout with the cookie
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(HttpCode.OK);

    expect(logoutRes.body.status).toBe('success');
    expect(logoutRes.body.message).toBe('Logged out successfully');
    // Check that the refresh token cookie is cleared
    expect(logoutRes.headers['set-cookie'][0]).toContain('jid=;');
    expect(logoutRes.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('should protect a route with authentication middleware', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .expect(HttpCode.UNAUTHORIZED); // Expect 401 without token

    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
  });

  it('should allow access to a protected route with a valid token', async () => {
    // Register and login to get a valid token
    await request(app).post('/api/v1/auth/register').send(registerPayload);
    const loginRes = await request(app).post('/api/v1/auth/login').send(loginPayload);
    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpCode.OK);

    expect(res.body.status).toBe('success');
    expect(res.body.data.user.email).toBe(registerPayload.email);
  });

  it('should reject access to a protected route with an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer invalidtoken123`)
      .expect(HttpCode.UNAUTHORIZED);

    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Invalid token. Please log in again!');
  });

  it('should reject access to a protected route with an expired token', async () => {
    // Manually create an expired token
    const user = await prisma.user.create({
      data: {
        name: 'Expired Token User',
        email: 'expired@example.com',
        password: await hashPassword('Password123!'),
      },
    });

    const expiredToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '1ms' });
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for token to expire

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(HttpCode.UNAUTHORIZED);

    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Your token has expired! Please log in again.');

    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should reject access if user changes password after token was issued', async () => {
    // 1. Register and login
    await request(app).post('/api/v1/auth/register').send(registerPayload);
    const loginRes = await request(app).post('/api/v1/auth/login').send(loginPayload);
    const accessToken = loginRes.body.data.accessToken;

    // 2. Simulate password change
    await prisma.user.update({
      where: { email: registerPayload.email },
      data: {
        password: await hashPassword('NewPassword123!'),
        passwordChangedAt: new Date(),
      },
    });

    // 3. Try to access with old token
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpCode.UNAUTHORIZED);

    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('User recently changed password! Please log in again.');
  });
});
```

**Performance Tests (Conceptual using k6)**

This is a conceptual script, as running full performance tests requires a dedicated environment and time.