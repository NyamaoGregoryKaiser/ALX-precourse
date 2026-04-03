```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { ScrapingJob } from '../src/scraping/entities/scraping-job.entity';
import { ScrapingResult } from '../src/scraping/entities/scraping-result.entity';
import { ScrapingTask } from '../src/scraping/entities/scraping-task.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { RedisService } from '../src/caching/redis.service';
import { LoggerService } from '../src/logger/logger.service';
import { BullMQModule } from '@nestjs/bullmq';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let redisService: RedisService;

  const testUser = {
    username: 'e2e_user',
    email: 'e2e_user@example.com',
    password: 'e2e_password',
    id: 'e2e_user_id', // Mock ID
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        // Override TypeOrmModule to use a test database or in-memory for faster tests
        TypeOrmModule.forRoot({
          type: 'sqlite', // Use sqlite in-memory for E2E tests for speed
          database: ':memory:',
          entities: [User, ScrapingJob, ScrapingResult, ScrapingTask],
          synchronize: true, // Use synchronize for e2e tests
          logging: false,
        }),
        BullMQModule.forRoot({
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
        }),
      ],
      // Mock LoggerService to prevent console pollution during tests
      providers: [
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);
    redisService = moduleFixture.get<RedisService>(RedisService);

    // Apply global pipes and filters like in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();

    // Clear Redis cache before tests
    await redisService.reset();

    // Seed a test user directly into the in-memory SQLite DB
    const userRepository = app.get('UserRepository'); // Get repository via DI
    const hashedPassword = await argon2.hash(testUser.password);
    await userRepository.save({
      id: testUser.id,
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user and return an access token', async () => {
      const newUser = {
        username: 'new_e2e_user',
        email: 'new_e2e_user@example.com',
        password: 'new_e2e_password',
      };
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(newUser)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(typeof res.body.accessToken).toBe('string');
        });
    });

    it('should return 400 if username is already taken', async () => {
      const existingUser = {
        username: testUser.username,
        email: 'another_e2e_user@example.com',
        password: 'password',
      };
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(existingUser)
        .expect(HttpStatus.UNAUTHORIZED) // Auth service logic returns 401
        .expect((res) => {
          expect(res.body.message).toEqual('Username already taken');
        });
    });

    it('should return 400 for invalid email', async () => {
      const invalidUser = {
        username: 'invalid_email_user',
        email: 'invalid-email',
        password: 'password',
      };
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.message).toContain('email must be an email');
        });
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('should log in an existing user and return an access token', async () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: testUser.username, password: testUser.password })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(typeof res.body.accessToken).toBe('string');
        });
    });

    it('should return 401 for invalid credentials', async () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: testUser.username, password: 'wrongpassword' })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.message).toEqual('Invalid credentials');
        });
    });

    it('should return 401 for non-existent user', async () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password' })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.message).toEqual('Invalid credentials');
        });
    });
  });

  describe('Authenticated routes protection', () => {
    it('should return 401 for unauthenticated access to protected routes', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.message).toEqual('Authentication failed');
        });
    });
  });

  // More E2E tests for other modules (users, scraping jobs) would follow here,
  // typically involving first logging in to get a token and then using it.
});
```