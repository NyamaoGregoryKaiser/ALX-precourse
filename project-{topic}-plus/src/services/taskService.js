```javascript
const taskRepository = require('../repositories/taskRepository');
const categoryService = require('./categoryService'); // To validate category existence
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const { TaskStatus, TaskPriority } = require('@prisma/client');

/**
 * Task Service Module
 * Handles business logic for task management.
 */
const taskService = {
  /**
   * Creates a new task for a specific user.
   * @param {string} userId - The ID of the user creating the task.
   * @param {object} taskData - The data for the new task.
   * @returns {Promise<object>} The newly created task.
   * @throws {AppError} If categoryId is provided but not found or not owned by the user.
   */
  async createTask(userId, taskData) {
    const { categoryId, ...data } = taskData;

    if (categoryId) {
      // Validate if the category exists and belongs to the user
      await categoryService.getCategoryById(categoryId, userId);
    }

    const newTask = await taskRepository.create({
      ...data,
      userId,
      categoryId: categoryId || null, // Ensure categoryId is null if not provided
      // Ensure enum values are uppercase
      status: data.status ? data.status.toUpperCase() : TaskStatus.PENDING,
      priority: data.priority ? data.priority.toUpperCase() : TaskPriority.MEDIUM,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined, // Convert to Date object
    });
    return newTask;
  },

  /**
   * Retrieves a task by its ID, ensuring it belongs to the specified user.
   * @param {string} taskId - The ID of the task.
   * @param {string} userId - The ID of the user who owns the task.
   * @returns {Promise<object>} The task object.
   * @throws {AppError} If the task is not found or does not belong to the user.
   */
  async getTaskById(taskId, userId) {
    const task = await taskRepository.findById(taskId, {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    });

    if (!task || task.userId !== userId) {
      throw new AppError('Task not found.', 404);
    }
    return task;
  },

  /**
   * Retrieves all tasks for a specific user.
   * Supports filtering, sorting, and pagination.
   * @param {string} userId - The ID of the user.
   * @param {object} queryString - The query parameters from the request (req.query).
   * @returns {Promise<object>} An object containing results and total count.
   */
  async getAllTasks(userId, queryString) {
    const features = new APIFeatures(taskRepository.prisma.task, queryString)
      .filter()
      .sort()
      .paginate();

    const tasks = await taskRepository.findAllByUserId(
      userId,
      features.queryOptions,
      {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      }
    );
    const totalCount = await taskRepository.countByUserId(userId, features.findManyArgs.where);

    return {
      results: tasks.length,
      total: totalCount,
      tasks,
    };
  },

  /**
   * Updates an existing task, ensuring it belongs to the specified user.
   * @param {string} taskId - The ID of the task to update.
   * @param {string} userId - The ID of the user who owns the task.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated task object.
   * @throws {AppError} If the task is not found, does not belong to the user,
   *                    or if categoryId is provided but not found or not owned by the user.
   */
  async updateTask(taskId, userId, updateData) {
    // 1. Check if task exists and belongs to the user
    const task = await taskService.getTaskById(taskId, userId); // This also includes category for validation

    // 2. Validate categoryId if provided
    if (updateData.categoryId !== undefined) {
      if (updateData.categoryId === null) {
        // Allow unsetting the category
        updateData.categoryId = null;
      } else {
        // Validate if the new category exists and belongs to the user
        await categoryService.getCategoryById(updateData.categoryId, userId);
      }
    }

    // 3. Convert enum values to uppercase if provided
    if (updateData.status) {
      updateData.status = updateData.status.toUpperCase();
    }
    if (updateData.priority) {
      updateData.priority = updateData.priority.toUpperCase();
    }
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    // 4. Update the task
    const updatedTask = await taskRepository.update(taskId, updateData);
    return updatedTask;
  },

  /**
   * Deletes a task, ensuring it belongs to the specified user.
   * @param {string} taskId - The ID of the task to delete.
   * @param {string} userId - The ID of the user who owns the task.
   * @returns {Promise<object>} The deleted task object.
   * @throws {AppError} If the task is not found or does not belong to the user.
   */
  async deleteTask(taskId, userId) {
    // 1. Check if task exists and belongs to the user
    await taskService.getTaskById(taskId, userId); // This will throw 404 if not found or unauthorized

    // 2. Delete the task
    const deletedTask = await taskRepository.delete(taskId);
    return deletedTask;
  },
};

module.exports = taskService;
```