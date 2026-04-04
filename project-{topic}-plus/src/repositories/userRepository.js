```javascript
const { prisma } = require('../config/db');

/**
 * User Repository Module
 * Handles all direct database interactions for the User model.
 */
const userRepository = {
  /**
   * Finds a user by their ID.
   * @param {string} id - The ID of the user.
   * @returns {Promise<object|null>} The user object or null if not found.
   */
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Finds a user by their email, optionally including the password hash.
   * @param {string} email - The email of the user.
   * @param {boolean} [withPassword=false] - Whether to include the password hash.
   * @returns {Promise<object|null>} The user object or null if not found.
   */
  async findByEmail(email, withPassword = false) {
    const selectFields = {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    };
    if (withPassword) {
      selectFields.password = true;
    }
    return prisma.user.findUnique({
      where: { email },
      select: selectFields,
    });
  },

  /**
   * Finds a user by their username.
   * @param {string} username - The username of the user.
   * @returns {Promise<object|null>} The user object or null if not found.
   */
  async findByUsername(username) {
    return prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Creates a new user.
   * @param {object} userData - The user data (username, email, password, role).
   * @returns {Promise<object>} The newly created user object (without password).
   */
  async create(userData) {
    const newUser = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return newUser;
  },

  /**
   * Updates an existing user.
   * @param {string} id - The ID of the user to update.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object|null>} The updated user object or null if not found.
   */
  async update(id, updateData) {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  },

  /**
   * Deletes a user.
   * @param {string} id - The ID of the user to delete.
   * @returns {Promise<object|null>} The deleted user object or null if not found.
   */
  async delete(id) {
    const deletedUser = await prisma.user.delete({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return deletedUser;
  },

  /**
   * Finds all users. (Admin only functionality)
   * @param {object} [queryOptions={}] - Options for filtering, sorting, pagination.
   * @returns {Promise<Array<object>>} A list of user objects.
   */
  async findAll(queryOptions = {}) {
    return prisma.user.findMany({
      ...queryOptions,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Counts the total number of users based on filters.
   * @param {object} [where={}] - Prisma 'where' clause for filtering.
   * @returns {Promise<number>} The total count of users.
   */
  async count(where = {}) {
    return prisma.user.count({ where });
  },
};

module.exports = userRepository;
```