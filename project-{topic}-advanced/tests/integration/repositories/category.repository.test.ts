```typescript
import { prisma } from '../../../src/database/prisma-client';
import * as categoryRepository from '../../../src/modules/categories/category.repository';
import * as userRepository from '../../../src/modules/users/user.repository';
import { hashPassword } from '../../../src/utils/password-hasher';
import { USER_ROLES } from '../../../src/config/constants';

describe('Category Repository', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a user to associate categories with
    const hashedPassword = await hashPassword('password123');
    const user = await prisma.user.create({
      data: {
        name: 'Repo Test User',
        email: 'repo.test@example.com',
        password: hashedPassword,
        role: USER_ROLES.USER,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up the user after all tests in this suite
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  it('should create a new category', async () => {
    const categoryName = 'New Test Category';
    const category = await categoryRepository.createCategory(categoryName, testUserId);

    expect(category).toBeDefined();
    expect(category.name).toBe(categoryName);
    expect(category.userId).toBe(testUserId);

    const foundCategory = await prisma.category.findUnique({ where: { id: category.id } });
    expect(foundCategory).toEqual(category);
  });

  it('should find all categories for a user', async () => {
    await categoryRepository.createCategory('Category 1', testUserId);
    await categoryRepository.createCategory('Category 2', testUserId);

    const categories = await categoryRepository.findAllCategories(testUserId);
    expect(categories).toBeDefined();
    expect(categories.length).toBeGreaterThanOrEqual(2); // At least 2, plus any from previous tests if not cleared
    expect(categories.every(cat => cat.userId === testUserId)).toBe(true);
  });

  it('should find a category by ID and user ID', async () => {
    const category = await categoryRepository.createCategory('Specific Category', testUserId);
    const foundCategory = await categoryRepository.findCategoryByIdAndUser(category.id, testUserId);

    expect(foundCategory).toBeDefined();
    expect(foundCategory?.id).toBe(category.id);
    expect(foundCategory?.userId).toBe(testUserId);
  });

  it('should return null if category by ID and user ID is not found', async () => {
    const foundCategory = await categoryRepository.findCategoryByIdAndUser('invalid-uuid', testUserId);
    expect(foundCategory).toBeNull();
  });

  it('should return null if category by ID exists but not for specified user ID', async () => {
    const anotherUserHashedPassword = await hashPassword('password123');
    const anotherUser = await prisma.user.create({
      data: {
        name: 'Another User',
        email: 'another.user@example.com',
        password: anotherUserHashedPassword,
        role: USER_ROLES.USER,
      },
    });
    const category = await categoryRepository.createCategory('Category for Another User', anotherUser.id);
    const foundCategory = await categoryRepository.findCategoryByIdAndUser(category.id, testUserId); // Trying to access with wrong user
    expect(foundCategory).toBeNull();
    await prisma.user.delete({ where: { id: anotherUser.id } });
  });

  it('should find a category by name and user ID', async () => {
    const categoryName = 'Category by Name';
    const category = await categoryRepository.createCategory(categoryName, testUserId);
    const foundCategory = await categoryRepository.findCategoryByNameAndUser(categoryName, testUserId);

    expect(foundCategory).toBeDefined();
    expect(foundCategory?.name).toBe(categoryName);
    expect(foundCategory?.userId).toBe(testUserId);
  });

  it('should return null if category by name and user ID is not found', async () => {
    const foundCategory = await categoryRepository.findCategoryByNameAndUser('NonExistent Category', testUserId);
    expect(foundCategory).toBeNull();
  });

  it('should update a category', async () => {
    const category = await categoryRepository.createCategory('Old Name', testUserId);
    const updatedName = 'Updated Name';
    const updatedCategory = await categoryRepository.updateCategory(category.id, updatedName);

    expect(updatedCategory).toBeDefined();
    expect(updatedCategory.id).toBe(category.id);
    expect(updatedCategory.name).toBe(updatedName);

    const foundCategory = await prisma.category.findUnique({ where: { id: category.id } });
    expect(foundCategory?.name).toBe(updatedName);
  });

  it('should delete a category', async () => {
    const category = await categoryRepository.createCategory('Category to Delete', testUserId);
    const deletedCategory = await categoryRepository.deleteCategory(category.id);

    expect(deletedCategory).toBeDefined();
    expect(deletedCategory.id).toBe(category.id);

    const foundCategory = await prisma.category.findUnique({ where: { id: category.id } });
    expect(foundCategory).toBeNull();
  });

  it('should handle deleting a non-existent category gracefully (Prisma error)', async () => {
    await expect(categoryRepository.deleteCategory('non-existent-id')).rejects.toThrow(); // Prisma throws error for not found
  });
});
```

**API Tests (End-to-End)**