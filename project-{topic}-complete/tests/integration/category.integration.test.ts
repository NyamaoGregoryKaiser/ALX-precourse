import request from 'supertest';
import { AppDataSource } from '../../src/database/data-source';
import { Category } from '../../src/database/entities/Category.entity';
import app from '../../src/app';

describe('Category Integration Tests', () => {
  let categoryRepository = AppDataSource.getRepository(Category);

  beforeAll(async () => {
    // Jest global setup/teardown handles DB connection and migrations.
    // Ensure all tables are cleared before running integration tests.
  });

  afterEach(async () => {
    // This is handled by jest.setup.ts beforeEach which truncates all tables.
  });

  describe('POST /api/v1/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Electronics',
        description: 'Electronic gadgets and devices',
      };

      const response = await request(app)
        .post('/api/v1/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: categoryData.name,
          description: categoryData.description,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );

      const createdCategory = await categoryRepository.findOneBy({ id: response.body.id });
      expect(createdCategory).not.toBeNull();
      expect(createdCategory?.name).toBe(categoryData.name);
    });

    it('should return 400 if name is missing', async () => {
      const categoryData = {
        description: 'Some description',
      };

      const response = await request(app)
        .post('/api/v1/categories')
        .send(categoryData)
        .expect(400);

      expect(response.body.message).toContain('name is required');
    });

    it('should return 409 if category name already exists', async () => {
      const categoryData = {
        name: 'Books',
        description: 'Collection of books',
      };

      await categoryRepository.save(categoryRepository.create(categoryData)); // Pre-create category

      const response = await request(app)
        .post('/api/v1/categories')
        .send(categoryData)
        .expect(409);

      expect(response.body.message).toContain('A category with this name already exists.');
    });
  });

  describe('GET /api/v1/categories', () => {
    it('should return all categories', async () => {
      const category1 = await categoryRepository.save(categoryRepository.create({ name: 'Gadgets', description: 'Cool gadgets' }));
      const category2 = await categoryRepository.save(categoryRepository.create({ name: 'Apparel', description: 'Wearables' }));

      const response = await request(app)
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: category1.id, name: 'Gadgets' }),
          expect.objectContaining({ id: category2.id, name: 'Apparel' }),
        ])
      );
    });

    it('should return an empty array if no categories exist', async () => {
      const response = await request(app)
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('should return a category by ID', async () => {
      const category = await categoryRepository.save(categoryRepository.create({ name: 'Home Goods', description: 'Items for home' }));

      const response = await request(app)
        .get(`/api/v1/categories/${category.id}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: category.id,
          name: category.name,
          description: category.description,
        })
      );
    });

    it('should return 404 if category ID is not found', async () => {
      const nonExistentId = '11111111-2222-3333-4444-555555555555';
      const response = await request(app)
        .get(`/api/v1/categories/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toContain(`Category with ID ${nonExistentId} not found.`);
    });

    it('should return 400 if ID is not a valid UUID', async () => {
      const invalidId = 'invalid-uuid';
      const response = await request(app)
        .get(`/api/v1/categories/${invalidId}`)
        .expect(400);

      expect(response.body.message).toContain('id must be a valid UUID');
    });
  });

  describe('PUT /api/v1/categories/:id', () => {
    it('should update an existing category', async () => {
      const category = await categoryRepository.save(categoryRepository.create({ name: 'Outdoor', description: 'Outdoor gear' }));
      const updateData = {
        name: 'Camping & Hiking',
        description: 'Equipment for camping and hiking',
      };

      const response = await request(app)
        .put(`/api/v1/categories/${category.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: category.id,
          name: updateData.name,
          description: updateData.description,
        })
      );

      const updatedCategory = await categoryRepository.findOneBy({ id: category.id });
      expect(updatedCategory?.name).toBe(updateData.name);
    });

    it('should return 404 if category ID is not found for update', async () => {
      const nonExistentId = '11111111-2222-3333-4444-555555555555';
      const updateData = { name: 'Non Existent Category' };

      const response = await request(app)
        .put(`/api/v1/categories/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.message).toContain(`Category with ID ${nonExistentId} not found.`);
    });

    it('should return 400 if update data is invalid', async () => {
      const category = await categoryRepository.save(categoryRepository.create({ name: 'Old Category', description: 'Old desc' }));
      const updateData = { name: '' }; // Invalid name

      const response = await request(app)
        .put(`/api/v1/categories/${category.id}`)
        .send(updateData)
        .expect(400);

      expect(response.body.message).toContain('name is not allowed to be empty');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should delete an existing category', async () => {
      const category = await categoryRepository.save(categoryRepository.create({ name: 'Gardening', description: 'Gardening tools' }));

      await request(app)
        .delete(`/api/v1/categories/${category.id}`)
        .expect(204);

      const deletedCategory = await categoryRepository.findOneBy({ id: category.id });
      expect(deletedCategory).toBeNull();
    });

    it('should return 404 if category ID is not found for deletion', async () => {
      const nonExistentId = '11111111-2222-3333-4444-555555555555';

      const response = await request(app)
        .delete(`/api/v1/categories/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toContain(`Category with ID ${nonExistentId} not found.`);
    });

    it('should return 400 if ID is not a valid UUID for deletion', async () => {
      const invalidId = 'invalid-uuid-delete';
      const response = await request(app)
        .delete(`/api/v1/categories/${invalidId}`)
        .expect(400);

      expect(response.body.message).toContain('id must be a valid UUID');
    });
  });
});