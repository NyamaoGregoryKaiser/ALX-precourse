```javascript
const { prisma } = require('../config/db');

/**
 * Task Repository Module
 * Handles all direct database interactions for the Task model.
 */
const taskRepository = {
  /**
   * Finds a task by its ID.
   * @param {string} id - The ID of the task.
   * @param {object} [includeOptions={}] - Optional Prisma 'include' object for relations.
   * @returns {Promise<object|null>} The task object or null if not found.
   */
  async findById(id, includeOptions = {}) {
    return prisma.task.findUnique({
      where: { id },
      include: includeOptions,
    });
  },

  /**
   * Creates a new task.
   * @param {object} taskData - The task data (title, description, status, priority, dueDate, userId, categoryId).
   * @returns {Promise<object>} The newly created task object.
   */
  async create(taskData) {
    return prisma.task.create({
      data: taskData,
    });
  },

  /**
   * Updates an existing task.
   * @param {string} id - The ID of the task to update.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object|null>} The updated task object or null if not found.
   */
  async update(id, updateData) {
    return prisma.task.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * Deletes a task.
   * @param {string} id - The ID of the task to delete.
   * @returns {Promise<object|null>} The deleted task object or null if not found.
   */
  async delete(id) {
    return prisma.task.delete({
      where: { id },
    });
  },

  /**
   * Finds all tasks belonging to a specific user.
   * @param {string} userId - The ID of the user.
   * @param {object} [queryOptions={}] - Options for filtering, sorting, pagination.
   * @param {object} [includeOptions={}] - Optional Prisma 'include' object for relations.
   * @returns {Promise<Array<object>>} A list of task objects.
   */
  async findAllByUserId(userId, queryOptions = {}, includeOptions = {}) {
    return prisma.task.findMany({
      where: {
        userId,
        ...queryOptions.where, // Apply additional filters from APIFeatures
      },
      orderBy: queryOptions.orderBy,
      select: queryOptions.select,
      skip: queryOptions.skip,
      take: queryOptions.take,
      include: includeOptions,
    });
  },

  /**
   * Counts the total number of tasks for a specific user based on filters.
   * @param {string} userId - The ID of the user.
   * @param {object} [where={}] - Prisma 'where' clause for filtering.
   * @returns {Promise<number>} The total count of tasks.
   */
  async countByUserId(userId, where = {}) {
    return prisma.task.count({
      where: {
        userId,
        ...where,
      },
    });
  },
};

module.exports = taskRepository;
```