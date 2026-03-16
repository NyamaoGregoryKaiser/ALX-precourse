import request from 'supertest';
import app from '../../app';
import { AppDataSource } from '../../db/data-source';
import { User, UserRole } from '../../db/entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller Integration Tests', () => {
  let userRepository: any;

  beforeAll(async () => {
    userRepository = AppDataSource.getRepository(User);
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(User).query(`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`);
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword123');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('mock_jwt_token');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe(newUser.username);
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.user.role).toBe(UserRole.USER); // Default role
      expect(bcrypt.hash).toHaveBeenCalledWith(newUser.password, 10);

      const userInDb = await userRepository.findOneBy({ email: newUser.email });
      expect(userInDb).toBeDefined();
    });

    it('should return 409 if user already exists', async () => {
      // First, create a user directly in the DB
      const existingUser = userRepository.create({
        username: 'existing',
        email: 'existing@example.com',
        password: 'hashedpassword',
        role: UserRole.USER,
      });
      await userRepository.save(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'another',
          email: 'existing@example.com', // Duplicate email
          password: 'password123',
        })
        .expect(409);

      expect(response.body.message).toBe('User with that email or username already exists');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com' }) // Missing password
        .expect(400);

      expect(response.body.message).toBe('Username, email, and password are required');
    });
  });

  describe('POST /api/auth/login', () => {
    let createdUser: User;
    beforeEach(async () => {
      createdUser = userRepository.create({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'hashedpassword123',
        role: UserRole.USER,
      });
      await userRepository.save(createdUser);
    });

    it('should log in a user successfully and return a token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'login@example.com', password: 'password123' })
        .expect(200);

      expect(response.body).toHaveProperty('token', 'mock_jwt_token');
      expect(response.body.user).toHaveProperty('id', createdUser.id);
      expect(response.body.user.email).toBe(createdUser.email);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword123');
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should return 401 for invalid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Simulate wrong password

      const response = await request(app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'login@example.com', password: 'wrongpassword' })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'login@example.com' }) // Missing password
        .expect(400);

      expect(response.body.message).toBe('Email/username and password are required');
    });
  });
});