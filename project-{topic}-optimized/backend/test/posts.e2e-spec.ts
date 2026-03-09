```typescript
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Post, PostStatus } from '../src/posts/entities/post.entity';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../src/database/data-source'; // Use the same data source for testing

describe('PostsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminUser: User;
  let editorUser: User;
  let adminToken: string;
  let editorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    dataSource = AppDataSource; // Use the configured data source
    if (!dataSource.isInitialized) {
        await dataSource.initialize();
    }
    
    // Clear database before tests
    await dataSource.synchronize(true); // WARNING: This drops and recreates schema! Use carefully.
                                       // For production-grade E2E, consider transactional tests or dedicated test DB.

    // Seed test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await dataSource.getRepository(User).save({
      email: 'admin_test@example.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'Test',
      role: UserRole.ADMIN,
    });
    editorUser = await dataSource.getRepository(User).save({
      email: 'editor_test@example.com',
      passwordHash: hashedPassword,
      firstName: 'Editor',
      lastName: 'Test',
      role: UserRole.EDITOR,
    });

    // Get JWT tokens
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin_test@example.com', password: 'password123' });
    adminToken = adminLoginRes.body.accessToken;

    const editorLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'editor_test@example.com', password: 'password123' });
    editorToken = editorLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('/posts (POST)', () => {
    it('should create a post as an admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Admin Post',
          content: 'This is a test post created by an admin.',
          slug: 'new-admin-post',
          status: PostStatus.PUBLISHED,
        })
        .expect(201);

      expect(response.body).toEqual(expect.objectContaining({
        title: 'New Admin Post',
        slug: 'new-admin-post',
        status: PostStatus.PUBLISHED,
        authorId: adminUser.id,
      }));

      const createdPost = await dataSource.getRepository(Post).findOneBy({ id: response.body.id });
      expect(createdPost).toBeDefined();
    });

    it('should create a post as an editor', async () => {
      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'New Editor Post',
          content: 'This is a test post created by an editor.',
          slug: 'new-editor-post',
          status: PostStatus.DRAFT,
        })
        .expect(201);

      expect(response.body).toEqual(expect.objectContaining({
        title: 'New Editor Post',
        slug: 'new-editor-post',
        status: PostStatus.DRAFT,
        authorId: editorUser.id,
      }));
    });

    it('should return 400 for invalid post data', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '', // Invalid title
          content: 'Some content.',
          slug: 'invalid-post',
        })
        .expect(400);
    });

    it('should return 401 if no token provided', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({ title: 'No auth', content: 'No auth', slug: 'no-auth' })
        .expect(401);
    });
  });

  describe('/posts (GET)', () => {
    let testPost: Post;

    beforeEach(async () => {
      // Create a post for retrieval tests
      testPost = await dataSource.getRepository(Post).save({
        title: 'Test Get Post',
        content: 'Content for retrieval.',
        slug: 'test-get-post',
        status: PostStatus.PUBLISHED,
        author: adminUser,
      });
    });

    afterEach(async () => {
      await dataSource.getRepository(Post).delete(testPost.id);
    });

    it('should retrieve all posts as an admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Test Get Post',
            slug: 'test-get-post',
          }),
        ]),
      );
    });

    it('should retrieve a specific post by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/posts/${testPost.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: testPost.id,
        title: 'Test Get Post',
      }));
    });

    it('should return 404 for a non-existent post ID', async () => {
      await request(app.getHttpServer())
        .get('/posts/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // Additional tests for PUT, DELETE, and authorization rules for different roles...
});
```