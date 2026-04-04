```javascript
const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/config/db');
const { clearDatabase, createTestUser } = require('../fixtures/authFixtures');
const { signToken } = require('../../src/utils/jwt');

describe('Category Controller Integration Tests', () => {
  let regularUser, regularToken;
  let category1, category2;

  beforeAll(async () => {
    await clearDatabase();
    regularUser = await createTestUser({ email: 'usercat@test.com', username: 'usercat' });
    regularToken = signToken(regularUser.id);
  });

  beforeEach(async () => {
    // Clear categories for the current user before each test to ensure isolation
    await prisma.category.deleteMany({ where: { userId: regularUser.id } });

    // Create some fresh categories for the user
    category1 = await prisma.category.create({
      data: { name: 'Work', userId: regularUser.id },
    });
    category2 = await prisma.category.create({
      data: { name: 'Personal', userId: regularUser.id },
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/categories', () => {
    it('should create a new category for the authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'Shopping List' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.category.name).toEqual('Shopping List');
      expect(res.body.data.category.userId).toEqual(regularUser.id);

      // Verify in DB
      const categoryInDb = await prisma.category.findUnique({ where: { id: res.body.data.category.id } });
      expect(categoryInDb).not.toBeNull();
      expect(categoryInDb.name).toEqual('Shopping List');
    });

    it('should return 409 if category with same name already exists for the user', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: category1.name }); // Use existing category name

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toContain(`Category with name '${category1.name}' already exists for this user.`);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('"name" is required');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .send({ name: 'Guest Category' });

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/v1/categories', () => {
    it('should get all categories for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.categories).toHaveLength(2); // category1 and category2
      expect(res.body.data.categories.map(c => c.name)).toEqual(expect.arrayContaining([category1.name, category2.name]));
      expect(res.body.data.categories.every(c => c.userId === regularUser.id)).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.statusCode).toEqual(401);
    });

    it('should filter categories by name', async () => {
      const res = await request(app)
        .get(`/api/v1/categories?name=${category1.name}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.categories).toHaveLength(1);
      expect(res.body.data.categories[0].name).toEqual(category1.name);
    });

    it('should paginate categories', async () => {
      // Create more categories for pagination testing
      await prisma.category.createMany({
        data: [
          { name: 'Category A', userId: regularUser.id },
          { name: 'Category B', userId: regularUser.id },
          { name: 'Category C', userId: regularUser.id },
        ],
      });

      const res = await request(app)
        .get('/api/v1/categories?page=1&limit=3')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.categories).toHaveLength(3);
      expect(res.body.total).toBeGreaterThanOrEqual(5); // 2 initial + 3 new
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('should get a specific category for the authenticated user', async () => {
      const res = await request(app)
        .get(`/api/v1/categories/${category1.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.category.id).toEqual(category1.id);
      expect(res.body.data.category.name).toEqual(category1.name);
      expect(res.body.data.category.userId).toEqual(regularUser.id);
    });

    it('should return 404 if category not found or does not belong to user', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com', username: 'otheruser' });
      const otherCategory = await prisma.category.create({
        data: { name: 'Other User Category', userId: otherUser.id },
      });

      const res = await request(app)
        .get(`/api/v1/categories/${otherCategory.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Category not found.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/v1/categories/${category1.id}`);
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('should update a category for the authenticated user', async () => {
      const newName = 'Updated Work';
      const res = await request(app)
        .patch(`/api/v1/categories/${category1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: newName });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.category.id).toEqual(category1.id);
      expect(res.body.data.category.name).toEqual(newName);

      // Verify in DB
      const categoryInDb = await prisma.category.findUnique({ where: { id: category1.id } });
      expect(categoryInDb.name).toEqual(newName);
    });

    it('should return 409 if new name already exists for the user', async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${category1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: category2.name }); // Try to update category1 to category2's name

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toContain(`Category with name '${category2.name}' already exists for this user.`);
    });

    it('should return 404 if category not found or does not belong to user', async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'Nonexistent' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Category not found.');
    });

    it('should return 400 if name is missing in body', async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${category1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('"name" is required');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    let categoryToDelete;
    beforeEach(async () => {
      categoryToDelete = await prisma.category.create({
        data: { name: 'To Delete', userId: regularUser.id },
      });
      // Create a task associated with this category
      await prisma.task.create({
        data: {
          title: 'Task in deleted category',
          userId: regularUser.id,
          categoryId: categoryToDelete.id,
        },
      });
    });

    it('should delete a category for the authenticated user', async () => {
      const res = await request(app)
        .delete(`/api/v1/categories/${categoryToDelete.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(204);
      expect(res.body).toEqual({});

      // Verify in DB
      const categoryInDb = await prisma.category.findUnique({ where: { id: categoryToDelete.id } });
      expect(categoryInDb).toBeNull();

      // Verify tasks associated with this category are updated (categoryId should be null)
      const tasksInDb = await prisma.task.findMany({
        where: { userId: regularUser.id, title: 'Task in deleted category' },
      });
      expect(tasksInDb).toHaveLength(1);
      expect(tasksInDb[0].categoryId).toBeNull();
    });

    it('should return 404 if category not found or does not belong to user', async () => {
      const res = await request(app)
        .delete(`/api/v1/categories/d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Category not found.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete(`/api/v1/categories/${categoryToDelete.id}`);
      expect(res.statusCode).toEqual(401);
    });
  });
});
```