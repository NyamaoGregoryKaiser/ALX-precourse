import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../src/common/enums/role.enum';
import { ConfigModule } from '@nestjs/config';
import { getTypeOrmConfig } from '../src/config/typeorm.config';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AppLogger } from '../src/common/logger/app-logger.service';


describe('AppController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let adminAccessToken: string;
  let userAccessToken: string;
  let adminUser: User;
  let regularUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: `.env.test`, // Use a specific test environment file
        }),
        TypeOrmModule.forRootAsync({
          useFactory: getTypeOrmConfig,
          inject: [ConfigModule],
        }),
        AppModule,
      ],
      providers: [
        {
          provide: AppLogger, // Mock the logger to prevent actual file writes during tests
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new AllExceptionsFilter(moduleFixture.get(AppLogger))); // Use the mocked logger
    await app.init();

    userRepository = moduleFixture.get(getRepositoryToken(User));

    // Clear and seed test database
    await userRepository.query('TRUNCATE TABLE users CASCADE;'); // Clear all data
    await userRepository.query('TRUNCATE TABLE datasets CASCADE;');
    await userRepository.query('TRUNCATE TABLE models CASCADE;');
    await userRepository.query('TRUNCATE TABLE prediction_logs CASCADE;');


    const hashedPassword = await bcrypt.hash('password123', 10);

    adminUser = userRepository.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: Role.Admin,
    });
    await userRepository.save(adminUser);

    regularUser = userRepository.create({
      username: 'user',
      email: 'user@example.com',
      password: hashedPassword,
      role: Role.User,
    });
    await userRepository.save(regularUser);

    // Get access tokens
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: 'password123' });
    adminAccessToken = adminLoginRes.body.access_token;

    const userLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: 'password123' });
    userAccessToken = userLoginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Flow (e2e)', () => {
    it('/auth/register (POST) - should register a new user', async () => {
      const newUser = {
        username: 'testregister',
        email: 'register@example.com',
        password: 'registerpassword',
      };
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(201);

      expect(res.body.email).toEqual(newUser.email);
      expect(res.body.username).toEqual(newUser.username);
      expect(res.body.role).toEqual(Role.User);
      expect(res.body.password).toBeUndefined(); // Password should not be returned
    });

    it('/auth/register (POST) - should fail if email already exists', async () => {
        const existingUser = {
            username: 'existinguser',
            email: 'admin@example.com', // Using existing admin email
            password: 'somepassword',
        };
        const res = await request(app.getHttpServer())
            .post('/api/v1/auth/register')
            .send(existingUser)
            .expect(409);
        expect(res.body.message).toEqual('Email or username already exists.');
    });

    it('/auth/login (POST) - should login existing user and return token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: regularUser.email, password: 'password123' })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      expect(typeof res.body.access_token).toBe('string');
    });

    it('/auth/login (POST) - should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: regularUser.email, password: 'wrongpassword' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401);
    });

    it('/auth/profile (POST) - should return user profile for authenticated user', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${userAccessToken}`)
            .expect(200);

        expect(res.body.id).toEqual(regularUser.id);
        expect(res.body.email).toEqual(regularUser.email);
        expect(res.body.username).toEqual(regularUser.username);
        expect(res.body.role).toEqual(regularUser.role);
        expect(res.body.password).toBeUndefined();
    });

    it('/auth/profile (POST) - should return 401 for unauthenticated user', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/auth/profile')
            .expect(401);
    });
  });

  describe('Users CRUD (e2e) - Admin Access', () => {
    it('/users (GET) - Admin should get all users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2); // admin, regular, and possibly testregister
      expect(res.body[0].password).toBeUndefined();
    });

    it('/users (GET) - Regular user should get 403 when trying to get all users', async () => {
        await request(app.getHttpServer())
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${userAccessToken}`)
            .expect(403);
    });

    it('/users/:id (GET) - Admin should get any user by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.id).toEqual(regularUser.id);
      expect(res.body.password).toBeUndefined();
    });

    it('/users/:id (GET) - User should get their own profile by ID', async () => {
        const res = await request(app.getHttpServer())
            .get(`/api/v1/users/${regularUser.id}`)
            .set('Authorization', `Bearer ${userAccessToken}`)
            .expect(200);

        expect(res.body.id).toEqual(regularUser.id);
    });

    it('/users/:id (GET) - User should get 403 when trying to get another user profile', async () => {
        await request(app.getHttpServer())
            .get(`/api/v1/users/${adminUser.id}`)
            .set('Authorization', `Bearer ${userAccessToken}`)
            .expect(403);
    });

    it('/users/:id (PATCH) - Admin should update any user', async () => {
      const updatedUsername = 'updated_regular_user';
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ username: updatedUsername })
        .expect(200);

      expect(res.body.username).toEqual(updatedUsername);
    });

    it('/users/:id (DELETE) - Admin should delete any user', async () => {
        const userToDelete = userRepository.create({
            username: 'todelete',
            email: 'todelete@example.com',
            password: await bcrypt.hash('pass', 10),
            role: Role.User,
        });
        await userRepository.save(userToDelete);

        await request(app.getHttpServer())
            .delete(`/api/v1/users/${userToDelete.id}`)
            .set('Authorization', `Bearer ${adminAccessToken}`)
            .expect(204);

        await request(app.getHttpServer())
            .get(`/api/v1/users/${userToDelete.id}`)
            .set('Authorization', `Bearer ${adminAccessToken}`)
            .expect(404);
    });

    it('/users/:id (DELETE) - Regular user should get 403 when trying to delete any user', async () => {
        await request(app.getHttpServer())
            .delete(`/api/v1/users/${adminUser.id}`)
            .set('Authorization', `Bearer ${userAccessToken}`)
            .expect(403);
    });
  });

  // Add similar e2e test suites for Datasets, Models, and Predictions
  // Ensure to test:
  // - CRUD operations for each resource
  // - Authentication (token present)
  // - Authorization (role-based access)
  // - Edge cases like missing files, invalid IDs, non-existent resources
  // - File uploads and downloads
});
```

*(Note: The full suite of E2E tests for Datasets, Models, and Predictions would involve mocking file uploads or handling temporary files, and asserting on database state. This example provides a solid foundation for Auth and Users modules, aiming for high coverage.)*

**Performance Tests (Conceptual):**
Performance tests are usually separate scripts.

```bash