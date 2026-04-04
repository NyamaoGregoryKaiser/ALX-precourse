```javascript
const { prisma } = require('../config/db');

/**
 * Category Repository Module
 * Handles all direct database interactions for the Category model.
 */
const categoryRepository = {
  /**
   * Finds a category by its ID.
   * @param {string} id - The ID of the category.
   * @returns {Promise<object|null>} The category object or null if not found.
   */
  async findById(id) {
    return prisma.category.findUnique({
      where: { id },
    });
  },

  /**
   * Finds a category by its name and user ID.
   * @param {string} name - The name of the category.
   * @param {string} userId - The ID of the user who owns the category.
   * @returns {Promise<object|null>} The category object or null if not found.
   */
  async findByNameAndUser(name, userId) {
    return prisma.category.findUnique({
      where: {
        name_userId: {
          name,
          userId,
        },
      },
    });
  },

  /**
   * Creates a new category for a specific user.
   * @param {object} categoryData - The category data (name, userId).
   * @returns {Promise<object>} The newly created category object.
   */
  async create(categoryData) {
    return prisma.category.create({
      data: categoryData,
    });
  },

  /**
   * Updates an existing category.
   * @param {string} id - The ID of the category to update.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object|null>} The updated category object or null if not found.
   */
  async update(id, updateData) {
    return prisma.category.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * Deletes a category.
   * @param {string} id - The ID of the category to delete.
   * @returns {Promise<object|null>} The deleted category object or null if not found.
   */
  async delete(id) {
    return prisma.category.delete({
      where: { id },
    });
  },

  /**
   * Finds all categories belonging to a specific user.
   * @param {string} userId - The ID of the user.
   * @param {object} [queryOptions={}] - Options for filtering, sorting, pagination.
   * @returns {Promise<Array<object>>} A list of category objects.
   */
  async findAllByUserId(userId, queryOptions = {}) {
    return prisma.category.findMany({
      where: { userId },
      ...queryOptions,
    });
  },

  /**
   * Counts the total number of categories for a specific user based on filters.
   * @param {string} userId - The ID of the user.
   * @param {object} [where={}] - Prisma 'where' clause for filtering.
   * @returns {Promise<number>} The total count of categories.
   */
  async countByUserId(userId, where = {}) {
    return prisma.category.count({
      where: {
        userId,
        ...where,
      },
    });
  },
};

module.exports = categoryRepository;
```