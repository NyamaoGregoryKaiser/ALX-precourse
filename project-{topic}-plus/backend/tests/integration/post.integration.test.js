```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { sequelize, User, Category, Post } = require('../../src/models');
const { generateAuthTokens } = require('../../src/services/token.service');

describe('Post routes', () => {
  let adminUser, editorUser, viewerUser, category, post;
  let adminAccessToken, editorAccessToken, viewerAccessToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create test users
    adminUser = await User.create({
      username: 'adminuser', email: 'admin@test.com', password: 'Password@123', role: 'admin',
    });
    editorUser = await User.create({
      username: 'editoruser', email: 'editor@test.com', password: 'Password@123', role: 'editor',
    });
    viewerUser = await User.create({
      username: 'vieweruser', email: 'viewer@test.com', password: 'Password@123', role: 'viewer',
    });

    // Generate tokens
    adminAccessToken = (await generateAuthTokens(adminUser)).access.token;
    editorAccessToken = (await generateAuthTokens(editorUser)).access.token;
    viewerAccessToken = (await generateAuthTokens(viewerUser)).access.token;

    // Create a test category
    category = await Category.create({
      name: 'Test Category', slug: 'test-category', description: 'Description for test category',
    });

    // Create a test post by editor
    post = await Post.create({
      title: 'Initial Test Post',
      slug: 'initial-test-post',
      content: 'Content of the initial test post.',
      status: 'published',
      authorId: editorUser.id,
      categoryId: category.id,
      publishedAt: new Date(),
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/posts', () => {
    let newPostData;

    beforeEach(() => {
      newPostData = {
        title: 'New Post Title',
        content: 'New post content goes here.',
        excerpt: 'A short excerpt.',
        status: 'draft',
        categoryId: category.id,
      };
    });

    test('should return 201 and create a new post if data is valid and user is editor/admin', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${editorAccessToken}`)
        .send(newPostData)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(newPostData.title);
      expect(res.body.authorId).toBe(editorUser.id);
      expect(res.body.status).toBe('draft');
      expect(res.body.slug).toBe('new-post-title'); // Auto-generated
    });

    test('should return 401 if access token is missing', async () => {
      await request(app)
        .post('/api/posts')
        .send(newPostData)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if user is viewer', async () => {
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${viewerAccessToken}`)
        .send(newPostData)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 if title is missing', async () => {
      delete newPostData.title;
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${editorAccessToken}`)
        .send(newPostData)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if slug is duplicate', async () => {
      await Post.create({
        title: 'Existing Post',
        slug: 'existing-post',
        content: 'Content',
        authorId: editorUser.id,
      });

      newPostData.title = 'Another existing post';
      newPostData.slug = 'existing-post';

      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${editorAccessToken}`)
        .send(newPostData)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/posts', () => {
    let draftPost;
    beforeAll(async () => {
      // Create a draft post for specific testing
      draftPost = await Post.create({
        title: 'Draft Post by Editor',
        slug: 'draft-post-by-editor',
        content: 'This is a draft.',
        status: 'draft',
        authorId: editorUser.id,
        categoryId: category.id,
      });
    });

    test('should return 200 and all published posts for unauthenticated users', async () => {
      const res = await request(app)
        .get('/api/posts')
        .expect(httpStatus.OK);

      expect(res.body.posts).toBeArrayOfSize(2); // Initial Post + other published seed data
      expect(res.body.posts[0].status).toBe('published');
      expect(res.body.posts.some(p => p.id === draftPost.id)).toBeFalse(); // Draft should not be visible
      expect(res.body.posts[0]).toHaveProperty('author');
      expect(res.body.posts[0]).toHaveProperty('category');
    });

    test('should return 200 and all posts (including drafts) for admin/editor', async () => {
      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      // We expect more posts now: 3 seeded published + 1 seeded draft + Initial Test Post (published) + Draft Post by Editor
      // Adjust size based on your actual seed data and created posts during tests.
      expect(res.body.posts.length).toBeGreaterThanOrEqual(4); // At least initial post + draft post + seeded posts
      expect(res.body.posts.some(p => p.id === draftPost.id)).toBeTrue(); // Draft should be visible
      expect(res.body.posts.some(p => p.id === post.id)).toBeTrue(); // Published should be visible
    });

    test('should return 200 and filter by status for admin/editor', async () => {
      const res = await request(app)
        .get('/api/posts?status=draft')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.posts.every(p => p.status === 'draft')).toBeTrue();
      expect(res.body.posts.some(p => p.id === draftPost.id)).toBeTrue();
    });

    test('should return 200 and filter by title', async () => {
      const res = await request(app)
        .get(`/api/posts?title=${encodeURIComponent(post.title.substring(0, 5))}`)
        .expect(httpStatus.OK);

      expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
      expect(res.body.posts[0].title).toContain(post.title.substring(0, 5));
    });
  });

  describe('GET /api/posts/:postId', () => {
    let privateDraftPost;
    beforeAll(async () => {
      privateDraftPost = await Post.create({
        title: 'Private Draft Post',
        slug: 'private-draft-post',
        content: 'This is a private draft.',
        status: 'draft',
        authorId: editorUser.id,
        categoryId: category.id,
      });
    });

    test('should return 200 and the post if it is published', async () => {
      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(post.id);
      expect(res.body.title).toBe(post.title);
      expect(res.body.status).toBe('published');
      expect(res.body).toHaveProperty('author');
      expect(res.body.author.id).toBe(editorUser.id);
    });

    test('should return 404 if post is not found', async () => {
      await request(app)
        .get(`/api/posts/${uuidv4()}`)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 403 for unauthenticated user trying to get a draft post', async () => {
      await request(app)
        .get(`/api/posts/${privateDraftPost.id}`)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 200 for admin trying to get a draft post', async () => {
      const res = await request(app)
        .get(`/api/posts/${privateDraftPost.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(privateDraftPost.id);
      expect(res.body.status).toBe('draft');
    });

    test('should return 200 for author trying to get their own draft post', async () => {
      const res = await request(app)
        .get(`/api/posts/${privateDraftPost.id}`)
        .set('Authorization', `Bearer ${editorAccessToken}`) // editorUser is the author
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(privateDraftPost.id);
      expect(res.body.status).toBe('draft');
    });

    test('should return 403 for non-author editor trying to get another user\'s draft post', async () => {
      const anotherEditor = await User.create({
        username: 'anothereditor', email: 'another@test.com', password: 'Password@123', role: 'editor',
      });
      const anotherEditorToken = (await generateAuthTokens(anotherEditor)).access.token;

      await request(app)
        .get(`/api/posts/${privateDraftPost.id}`)
        .set('Authorization', `Bearer ${anotherEditorToken}`)
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('PATCH /api/posts/:postId', () => {
    let updateData;
    beforeEach(() => {
      updateData = {
        title: 'Updated Post Title',
        status: 'published',
      };
    });

    test('should return 200 and update the post if user is author', async () => {
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${editorAccessToken}`) // editorUser is the author of `post`
        .send(updateData)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(post.id);
      expect(res.body.title).toBe(updateData.title);
      expect(res.body.status).toBe(updateData.status);
    });

    test('should return 200 and update the post if user is admin', async () => {
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ title: 'Admin Updated Title' })
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(post.id);
      expect(res.body.title).toBe('Admin Updated Title');
    });

    test('should return 403 if user is not author or admin', async () => {
      await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${viewerAccessToken}`)
        .send(updateData)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 401 if access token is missing', async () => {
      await request(app)
        .patch(`/api/posts/${post.id}`)
        .send(updateData)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 if post is not found', async () => {
      await request(app)
        .patch(`/api/posts/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 if slug is duplicate on update', async () => {
      const otherPost = await Post.create({
        title: 'Other Post',
        slug: 'other-post-slug',
        content: 'Content',
        authorId: adminUser.id,
      });

      await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ slug: 'other-post-slug' }) // Attempt to set duplicate slug
        .expect(httpStatus.BAD_REQUEST);

      await otherPost.destroy(); // Clean up
    });
  });

  describe('DELETE /api/posts/:postId', () => {
    let postToDelete;
    beforeEach(async () => {
      postToDelete = await Post.create({
        title: 'Post to Delete',
        slug: 'post-to-delete',
        content: 'Content to be deleted.',
        authorId: editorUser.id,
        status: 'draft',
      });
    });

    test('should return 204 if user is author', async () => {
      await request(app)
        .delete(`/api/posts/${postToDelete.id}`)
        .set('Authorization', `Bearer ${editorAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const deletedPost = await Post.findByPk(postToDelete.id);
      expect(deletedPost).toBeNull();
    });

    test('should return 204 if user is admin', async () => {
      const adminDeletePost = await Post.create({
        title: 'Admin delete',
        slug: 'admin-delete',
        content: '...',
        authorId: editorUser.id,
        status: 'draft',
      });
      await request(app)
        .delete(`/api/posts/${adminDeletePost.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const deletedPost = await Post.findByPk(adminDeletePost.id);
      expect(deletedPost).toBeNull();
    });

    test('should return 403 if user is not author or admin', async () => {
      await request(app)
        .delete(`/api/posts/${postToDelete.id}`)
        .set('Authorization', `Bearer ${viewerAccessToken}`)
        .expect(httpStatus.FORBIDDEN);

      const existingPost = await Post.findByPk(postToDelete.id);
      expect(existingPost).not.toBeNull();
    });

    test('should return 401 if access token is missing', async () => {
      await request(app)
        .delete(`/api/posts/${postToDelete.id}`)
        .expect(httpStatus.UNAUTHORIZED);

      const existingPost = await Post.findByPk(postToDelete.id);
      expect(existingPost).not.toBeNull();
    });

    test('should return 404 if post is not found', async () => {
      await request(app)
        .delete(`/api/posts/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
```