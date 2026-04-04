```javascript
const categoryRepository = require('../repositories/categoryRepository');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

/**
 * Category Service Module
 * Handles business logic for task categories.
 */
const categoryService = {
  /**
   * Creates a new category for a specific user.
   * @param {string} userId - The ID of the user creating the category.
   * @param {object} categoryData - The data for the new category (name).
   * @returns {Promise<object>} The newly created category.
   * @throws {AppError} If a category with the same name already exists for the user.
   */
  async createCategory(userId, categoryData) {
    const { name } = categoryData;

    // Check if category with the same name already exists for this user
    const existingCategory = await categoryRepository.findByNameAndUser(name, userId);
    if (existingCategory) {
      throw new AppError(`Category with name '${name}' already exists for this user.`, 409); // 409 Conflict
    }

    const newCategory = await categoryRepository.create({
      name,
      userId,
    });
    return newCategory;
  },

  /**
   * Retrieves a category by its ID, ensuring it belongs to the specified user.
   * @param {string} categoryId - The ID of the category.
   * @param {string} userId - The ID of the user who owns the category.
   * @returns {Promise<object>} The category object.
   * @throws {AppError} If the category is not found or does not belong to the user.
   */
  async getCategoryById(categoryId, userId) {
    const category = await categoryRepository.findById(categoryId);

    if (!category || category.userId !== userId) {
      throw new AppError('Category not found.', 404);
    }
    return category;
  },

  /**
   * Retrieves all categories for a specific user.
   * Supports filtering, sorting, and pagination.
   * @param {string} userId - The ID of the user.
   * @param {object} queryString - The query parameters from the request (req.query).
   * @returns {Promise<object>} An object containing results and total count.
   */
  async getAllCategories(userId, queryString) {
    const features = new APIFeatures(categoryRepository.prisma.category, queryString)
      .filter()
      .sort()
      .paginate();

    const categories = await categoryRepository.findAllByUserId(userId, features.queryOptions);
    const totalCount = await categoryRepository.countByUserId(userId, features.findManyArgs.where);

    return {
      results: categories.length,
      total: totalCount,
      categories,
    };
  },

  /**
   * Updates an existing category, ensuring it belongs to the specified user.
   * @param {string} categoryId - The ID of the category to update.
   * @param {string} userId - The ID of the user who owns the category.
   * @param {object} updateData - The data to update (name).
   * @returns {Promise<object>} The updated category object.
   * @throws {AppError} If the category is not found, does not belong to the user,
   *                    or if a duplicate name is attempted for the user.
   */
  async updateCategory(categoryId, userId, updateData) {
    // 1. Check if category exists and belongs to the user
    const category = await categoryService.getCategoryById(categoryId, userId);

    // 2. Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== category.name) {
      const existingCategory = await categoryRepository.findByNameAndUser(updateData.name, userId);
      if (existingCategory) {
        throw new AppError(`Category with name '${updateData.name}' already exists for this user.`, 409);
      }
    }

    // 3. Update the category
    const updatedCategory = await categoryRepository.update(categoryId, updateData);
    return updatedCategory;
  },

  /**
   * Deletes a category, ensuring it belongs to the specified user.
   * Tasks associated with this category will have their categoryId set to null (SetNull behavior defined in schema).
   * @param {string} categoryId - The ID of the category to delete.
   * @param {string} userId - The ID of the user who owns the category.
   * @returns {Promise<object>} The deleted category object.
   * @throws {AppError} If the category is not found or does not belong to the user.
   */
  async deleteCategory(categoryId, userId) {
    // 1. Check if category exists and belongs to the user
    await categoryService.getCategoryById(categoryId, userId); // This will throw 404 if not found or unauthorized

    // 2. Delete the category
    const deletedCategory = await categoryRepository.delete(categoryId);
    return deletedCategory;
  },
};

module.exports = categoryService;
```