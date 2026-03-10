```javascript
const request = require('supertest');
const app = require('../../app');
const sequelize = require('../../config/database');
const User = require('../../models/user');
const Post = require('../../models/post');
const Category = require('../../models/category');
const Tag = require('../../models/tag');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

let adminUser, authorUser, adminToken, authorToken;

beforeAll(async () => {
  // Sync all models (clears data, but good for isolated testing)
  await sequelize.sync({ force: true });

  // Create users for testing
  adminUser = await User.create({
    username: 'adminTest',
    email: 'adminTest@example.com',
    password: 'password123', // Will be hashed by hook
    role: 'admin',
    isActive: true,
  });
  authorUser = await User.create({
    username: 'authorTest',
    email: 'authorTest@example.com',
    password: 'password123',
    role: 'author',
    isActive: true,
  });

  // Generate tokens
  adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, config.jwt.secret, { expiresIn: '1h' });
  authorToken = jwt.sign({ id: authorUser.id, role: authorUser.role }, config.jwt.secret, { expiresIn: '1h' });

  // Create a category
  await Category.create({ name: 'Tech', slug: 'tech' });
});

afterAll(async () => {
  await sequelize.drop(); // Drop all tables
  await sequelize.close();
});

describe('Post API Endpoints', () => {
  let category, postByAuthor;

  beforeEach(async () => {
    // Clear posts, categories, tags before each test for isolation
    await Post.destroy({ truncate: { cascade: true } });
    await Category.destroy({ truncate: { cascade: true } });
    await Tag.destroy({ truncate: { cascade: true } });

    category = await Category.create({ name: 'General', slug: 'general' });
    postByAuthor = await Post.create({
      title: 'Author\'s First Post',
      content: 'Content for author\'s post.',
      authorId: authorUser.id,
      categoryId: category.id,
      status: 'draft'
    });
  });

  // POST /api/v1/posts
  describe('POST /api/v1/posts', () => {
    it('should allow an admin to create a post', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Created Post',
          content: 'This is a test post by an admin.',
          authorId: adminUser.id,
          categoryId: category.id,
          status: 'published',
          tags: ['test', 'admin']
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Admin Created Post');
      expect(res.body.data.slug).toBe('admin-created-post');
      // Verify tags are associated (may require fetching post again with include)
    });

    it('should allow an author to create a post for themselves', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          title: 'Another Author Post',
          content: 'Content here.',
          authorId: authorUser.id, // Author's own ID
          categoryId: category.id,
          status: 'draft'
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorId).toBe(authorUser.id);
    });

    it('should prevent an author from creating a post for another user', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          title: 'Unauthorized Author Post',
          content: 'Content here.',
          authorId: adminUser.id, // Trying to post as admin
          categoryId: category.id,
          status: 'draft'
        });
      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authors can only create posts under their own ID.');
    });

    it('should require authentication to create a post', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .send({
          title: 'Unauthenticated Post',
          content: 'Content here.',
          authorId: authorUser.id,
          categoryId: category.id,
        });
      expect(res.statusCode).toEqual(401);
    });
  });

  // GET /api/v1/posts
  describe('GET /api/v1/posts', () => {
    it('should fetch all posts', async () => {
      await Post.create({
        title: 'Public Post 1', content: 'C1', authorId: adminUser.id, categoryId: category.id, status: 'published'
      });
      await Post.create({
        title: 'Public Post 2', content: 'C2', authorId: authorUser.id, categoryId: category.id, status: 'published'
      });
      postByAuthor.status = 'published';
      await postByAuthor.save();

      const res = await request(app).get('/api/v1/posts');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(3); // Including postByAuthor
      expect(res.body.data[0]).toHaveProperty('author');
      expect(res.body.data[0]).toHaveProperty('category');
      expect(res.body.data[0]).toHaveProperty('tags');
    });

    it('should filter posts by status', async () => {
      const publishedPost = await Post.create({
        title: 'Published Only', content: 'P', authorId: adminUser.id, categoryId: category.id, status: 'published'
      });
      postByAuthor.status = 'draft';
      await postByAuthor.save(); // Ensure it's a draft

      const res = await request(app).get('/api/v1/posts?status=published');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe(publishedPost.title);
    });
  });

  // GET /api/v1/posts/:identifier
  describe('GET /api/v1/posts/:identifier', () => {
    it('should fetch a single post by ID', async () => {
      const res = await request(app).get(`/api/v1/posts/${postByAuthor.id}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(postByAuthor.title);
    });

    it('should fetch a single post by slug', async () => {
      postByAuthor.slug = 'authors-first-post'; // Ensure slug is set or generated
      await postByAuthor.save();
      const res = await request(app).get(`/api/v1/posts/${postByAuthor.slug}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(postByAuthor.title);
    });

    it('should return 404 for a non-existent post', async () => {
      const res = await request(app).get('/api/v1/posts/nonexistent-id');
      expect(res.statusCode).toEqual(404);
    });
  });

  // PUT /api/v1/posts/:id
  describe('PUT /api/v1/posts/:id', () => {
    it('should allow an admin to update any post', async () => {
      const res = await request(app)
        .put(`/api/v1/posts/${postByAuthor.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title by Admin', status: 'published' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title by Admin');
      expect(res.body.data.status).toBe('published');
    });

    it('should allow an author to update their own post', async () => {
      const res = await request(app)
        .put(`/api/v1/posts/${postByAuthor.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'Updated content by author.', status: 'published' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Updated content by author.');
    });

    it('should prevent an author from updating another user\'s post', async () => {
      const postByAdmin = await Post.create({
        title: 'Admin Post to be updated', content: 'C', authorId: adminUser.id, categoryId: category.id
      });
      const res = await request(app)
        .put(`/api/v1/posts/${postByAdmin.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ title: 'Attempted Update' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authors can only update their own posts.');
    });
  });

  // DELETE /api/v1/posts/:id
  describe('DELETE /api/v1/posts/:id', () => {
    it('should allow an admin to delete any post', async () => {
      const res = await request(app)
        .delete(`/api/v1/posts/${postByAuthor.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      const checkPost = await Post.findByPk(postByAuthor.id);
      expect(checkPost).toBeNull();
    });

    it('should allow an author to delete their own post', async () => {
      const res = await request(app)
        .delete(`/api/v1/posts/${postByAuthor.id}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      const checkPost = await Post.findByPk(postByAuthor.id);
      expect(checkPost).toBeNull();
    });

    it('should prevent an author from deleting another user\'s post', async () => {
      const postByAdmin = await Post.create({
        title: 'Admin Post to be deleted', content: 'C', authorId: adminUser.id, categoryId: category.id
      });
      const res = await request(app)
        .delete(`/api/v1/posts/${postByAdmin.id}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authors can only delete their own posts.');
    });
  });
});
```