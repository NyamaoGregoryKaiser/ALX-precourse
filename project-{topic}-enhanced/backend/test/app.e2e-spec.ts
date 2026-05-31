```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Post, PostStatus } from '../src/posts/entities/post.entity';
import { Category } from '../src/categories/entities/category.entity';
import { JwtService } from '@nestjs/jwt';
import { AllExceptionsFilter } from '../src/shared/filters/global-exception.filter';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

describe('CMS End-to-End Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let categoryRepository: Repository<Category>;
  let postRepository: Repository<Post>;
  let jwtService: JwtService;

  let adminToken: string;
  let editorToken: string;
  let authorToken: string;
  let readerToken: string;

  let adminUser: User;
  let editorUser: User;
  let authorUser: User;
  let readerUser: User;
  let testCategory: Category;
  let testPost: Post;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(WINSTON_MODULE_PROVIDER) // Override Winston logger for tests
    .useValue(winston.createLogger({ transports: [new winston.transports.Console({ silent: true })] }))
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter(app.get(WINSTON_MODULE_PROVIDER))); // Use our custom exception filter
    await app.init();

    userRepository = moduleFixture.get(getRepositoryToken(User));
    categoryRepository = moduleFixture.get(getRepositoryToken(Category));
    postRepository = moduleFixture.get(getRepositoryToken(Post));
    jwtService = moduleFixture.get(JwtService);

    // Clear database before tests
    await postRepository.delete({});
    await categoryRepository.delete({});
    await userRepository.delete({});

    // Seed test users
    adminUser = await userRepository.save(userRepository.create({ username: 'admin_test', email: 'admin@test.com', password: 'password123', role: UserRole.ADMIN }));
    adminUser.password = await adminUser.hashPassword(); // Manually hash for tests
    await userRepository.save(adminUser);

    editorUser = await userRepository.save(userRepository.create({ username: 'editor_test', email: 'editor@test.com', password: 'password123', role: UserRole.EDITOR }));
    editorUser.password = await editorUser.hashPassword();
    await userRepository.save(editorUser);

    authorUser = await userRepository.save(userRepository.create({ username: 'author_test', email: 'author@test.com', password: 'password123', role: UserRole.AUTHOR }));
    authorUser.password = await authorUser.hashPassword();
    await userRepository.save(authorUser);

    readerUser = await userRepository.save(userRepository.create({ username: 'reader_test', email: 'reader@test.com', password: 'password123', role: UserRole.READER }));
    readerUser.password = await readerUser.hashPassword();
    await userRepository.save(readerUser);

    // Generate JWT tokens
    adminToken = jwtService.sign({ sub: adminUser.id, username: adminUser.username, role: adminUser.role });
    editorToken = jwtService.sign({ sub: editorUser.id, username: editorUser.username, role: editorUser.role });
    authorToken = jwtService.sign({ sub: authorUser.id, username: authorUser.username, role: authorUser.role });
    readerToken = jwtService.sign({ sub: readerUser.id, username: readerUser.username, role: readerUser.role });

    // Seed test category
    testCategory = await categoryRepository.save(categoryRepository.create({ name: 'Test Category', description: 'Description for test category' }));

    // Seed test post
    testPost = await postRepository.save(postRepository.create({
      title: 'Test Post Title',
      content: 'This is the content of the test post.',
      author: authorUser,
      category: testCategory,
      status: PostStatus.DRAFT,
    }));
  });

  afterAll(async () => {
    await postRepository.delete({});
    await categoryRepository.delete({});
    await userRepository.delete({});
    await app.close();
  });

  describe('Auth (e2e)', () => {
    it('/auth/login (POST) - should login admin user and return token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toEqual('admin@test.com');
      expect(response.body.user.role).toEqual(UserRole.ADMIN);
    });

    it('/auth/login (POST) - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'wrongpassword' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('/auth/register (POST) - should register a new author user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'new_author', email: 'newauthor@test.com', password: 'newpassword123', role: UserRole.AUTHOR })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toEqual('newauthor@test.com');
      expect(response.body.user.role).toEqual(UserRole.AUTHOR);

      // Clean up the registered user
      const createdUser = await userRepository.findOneBy({ email: 'newauthor@test.com' });
      if (createdUser) await userRepository.delete(createdUser.id);
    });

    it('/auth/register (POST) - should prevent registering with admin role by default', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'bad_user', email: 'baduser@test.com', password: 'newpassword123', role: UserRole.ADMIN })
        .expect(HttpStatus.UNAUTHORIZED); // This relies on AuthService.register internal check

      expect(response.body.message).toEqual('Cannot register with this role.');
    });
  });

  describe('Users (e2e)', () => {
    it('/users (GET) - admin should get all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThanOrEqual(4); // Seeded users
        });
    });

    it('/users (GET) - editor should get all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(HttpStatus.OK);
    });

    it('/users (GET) - author should be forbidden from getting all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('/users (POST) - admin should create a user', async () => {
      const createUserDto = {
        username: 'new_user_admin',
        email: 'newuseradmin@test.com',
        password: 'password123',
        role: UserRole.EDITOR,
      };
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.email).toEqual(createUserDto.email);
      expect(response.body.role).toEqual(createUserDto.role);
      expect(response.body).not.toHaveProperty('password'); // Password should be excluded

      // Clean up
      await userRepository.delete(response.body.id);
    });

    it('/users/:id (PATCH) - admin should update a user role', async () => {
      const newUser = await userRepository.save(userRepository.create({ username: 'temp_user', email: 'temp@test.com', password: 'password123', role: UserRole.AUTHOR }));

      const response = await request(app.getHttpServer())
        .patch(`/users/${newUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.EDITOR })
        .expect(HttpStatus.OK);

      expect(response.body.role).toEqual(UserRole.EDITOR);

      // Clean up
      await userRepository.delete(newUser.id);
    });

    it('/users/:id (DELETE) - admin should delete a user', async () => {
      const userToDelete = await userRepository.save(userRepository.create({ username: 'delete_me', email: 'delete@test.com', password: 'password123', role: UserRole.AUTHOR }));

      await request(app.getHttpServer())
        .delete(`/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.NO_CONTENT);

      const deletedUser = await userRepository.findOneBy({ id: userToDelete.id });
      expect(deletedUser).toBeNull();
    });
  });

  describe('Categories (e2e)', () => {
    it('/categories (GET) - anyone can get categories', () => {
      return request(app.getHttpServer())
        .get('/categories')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThanOrEqual(1);
          expect(res.body[0].name).toEqual(testCategory.name);
        });
    });

    it('/categories (POST) - admin should create a category', async () => {
      const createCategoryDto = { name: 'New Category', description: 'New description' };
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCategoryDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.name).toEqual(createCategoryDto.name);
      // Clean up
      await categoryRepository.delete(response.body.id);
    });

    it('/categories (POST) - author should be forbidden from creating a category', () => {
      const createCategoryDto = { name: 'Forbidden Category', description: 'Description' };
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(createCategoryDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Posts (e2e)', () => {
    it('/posts (GET) - anyone can get posts (even non-authenticated)', () => {
      return request(app.getHttpServer())
        .get('/posts')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThanOrEqual(1);
          expect(res.body[0].title).toEqual(testPost.title);
          expect(res.body[0].author).toBeDefined(); // Eager loaded
          expect(res.body[0].category).toBeDefined(); // Eager loaded
        });
    });

    it('/posts (GET) - can filter posts by status', async () => {
      // Create a published post
      const publishedPost = await postRepository.save(postRepository.create({
        title: 'Published Test Post',
        content: 'Content',
        author: authorUser,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      }));

      const response = await request(app.getHttpServer())
        .get('/posts?status=published')
        .expect(HttpStatus.OK);

      expect(response.body.some(p => p.id === publishedPost.id)).toBeTruthy();
      expect(response.body.every(p => p.status === PostStatus.PUBLISHED)).toBeTruthy();
      // Clean up
      await postRepository.delete(publishedPost.id);
    });

    it('/posts (POST) - author should create a post', async () => {
      const createPostDto = {
        title: 'Author New Post',
        content: 'Content by author.',
        categoryId: testCategory.id,
        status: PostStatus.DRAFT,
      };
      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(createPostDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.title).toEqual(createPostDto.title);
      expect(response.body.author.id).toEqual(authorUser.id);
      expect(response.body.category.id).toEqual(testCategory.id);
      expect(response.body.status).toEqual(PostStatus.DRAFT);

      // Clean up
      await postRepository.delete(response.body.id);
    });

    it('/posts/:id (PATCH) - author should update their own post', async () => {
      const authorOwnedPost = await postRepository.save(postRepository.create({
        title: 'Author Post to Update',
        content: 'Old content',
        author: authorUser,
        status: PostStatus.DRAFT,
      }));

      const response = await request(app.getHttpServer())
        .patch(`/posts/${authorOwnedPost.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'Updated content' })
        .expect(HttpStatus.OK);

      expect(response.body.content).toEqual('Updated content');
      // Clean up
      await postRepository.delete(authorOwnedPost.id);
    });

    it('/posts/:id (PATCH) - author should NOT update another author\'s post', async () => {
      const otherAuthor = await userRepository.save(userRepository.create({ username: 'other_author', email: 'other@test.com', password: 'password123', role: UserRole.AUTHOR }));
      const otherAuthorToken = jwtService.sign({ sub: otherAuthor.id, username: otherAuthor.username, role: otherAuthor.role });

      const postByOtherAuthor = await postRepository.save(postRepository.create({
        title: 'Other Author Post',
        content: 'Content',
        author: otherAuthor,
        status: PostStatus.DRAFT,
      }));

      await request(app.getHttpServer())
        .patch(`/posts/${postByOtherAuthor.id}`)
        .set('Authorization', `Bearer ${authorToken}`) // Author user trying to update
        .send({ content: 'Attempted to update' })
        .expect(HttpStatus.FORBIDDEN); // Expect forbidden due to role/ownership check

      // Clean up
      await postRepository.delete(postByOtherAuthor.id);
      await userRepository.delete(otherAuthor.id);
    });

    it('/posts/:id (DELETE) - editor should delete any post', async () => {
      const postToDelete = await postRepository.save(postRepository.create({
        title: 'Post to be deleted by editor',
        content: 'Content',
        author: authorUser,
        status: PostStatus.DRAFT,
      }));

      await request(app.getHttpServer())
        .delete(`/posts/${postToDelete.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(HttpStatus.NO_CONTENT);

      const deletedPost = await postRepository.findOneBy({ id: postToDelete.id });
      expect(deletedPost).toBeNull();
    });

    it('/posts/:id (DELETE) - author should be forbidden from deleting posts', async () => {
      const postToDelete = await postRepository.save(postRepository.create({
        title: 'Post should not be deleted by author',
        content: 'Content',
        author: authorUser,
        status: PostStatus.DRAFT,
      }));

      await request(app.getHttpServer())
        .delete(`/posts/${postToDelete.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(HttpStatus.FORBIDDEN);

      const postExists = await postRepository.findOneBy({ id: postToDelete.id });
      expect(postExists).not.toBeNull();
      // Clean up
      await postRepository.delete(postToDelete.id);
    });
  });

  describe('Rate Limiting (e2e)', () => {
    it('/auth/login (POST) - should rate limit login attempts', async () => {
      const maxAttempts = 100; // As per THROTLE_LIMIT in .env.example
      const loginPayload = { email: 'admin@test.com', password: 'wrongpassword' };

      // Make attempts up to the limit + 1
      for (let i = 0; i < maxAttempts; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginPayload)
          .expect(HttpStatus.UNAUTHORIZED); // Expect unauthorized due to wrong password
      }

      // The next request should be rate limited
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginPayload)
        .expect(HttpStatus.TOO_MANY_REQUESTS);
    }, 20000); // Increase timeout for this test if needed
  });
});
```