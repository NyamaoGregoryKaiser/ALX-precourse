```javascript
const db = require('../database');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

class UserService {
  /**
   * Fetches all users with optional pagination.
   * @param {object} query - Query parameters (page, limit).
   * @returns {object} Paginated list of users and total count.
   */
  async getAllUsers(query) {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await db.User.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      paranoid: true, // Only retrieve non-deleted users
    });

    logger.info(`Fetched ${users.length} users for page ${page}.`);
    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users,
    };
  }

  /**
   * Fetches a single user by their ID.
   * @param {string} id - User ID.
   * @returns {object} The user object.
   * @throws {AppError} If user not found.
   */
  async getUserById(id) {
    const user = await db.User.findByPk(id, {
      include: [
        {
          model: db.Product,
          as: 'products',
          attributes: ['id', 'name', 'price', 'stock', 'category']
        }
      ],
      paranoid: true,
    });

    if (!user) {
      throw new AppError(`User with ID ${id} not found.`, 404);
    }

    logger.info(`Fetched user with ID: ${id}`);
    return user;
  }

  /**
   * Creates a new user (typically for admin use or internal system).
   * For self-registration, use AuthService.register.
   * @param {object} userData - User details.
   * @returns {object} The newly created user.
   * @throws {AppError} If user with email or username already exists.
   */
  async createUser(userData) {
    const { username, email } = userData;

    const existingUser = await db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('User with this email already exists.', 409);
      }
      if (existingUser.username === username) {
        throw new AppError('User with this username already exists.', 409);
      }
    }

    const newUser = await db.User.create(userData);
    logger.info(`Admin created new user: ${newUser.email}`);
    return newUser;
  }

  /**
   * Updates an existing user.
   * @param {string} id - User ID.
   * @param {object} updateData - Data to update.
   * @returns {object} The updated user.
   * @throws {AppError} If user not found or conflict.
   */
  async updateUser(id, updateData) {
    const user = await db.User.findByPk(id, { paranoid: true });

    if (!user) {
      throw new AppError(`User with ID ${id} not found.`, 404);
    }

    // Handle potential uniqueness conflicts for email/username
    if (updateData.email && updateData.email !== user.email) {
      const existingEmailUser = await db.User.findOne({ where: { email: updateData.email } });
      if (existingEmailUser && existingEmailUser.id !== id) {
        throw new AppError(`User with email '${updateData.email}' already exists.`, 409);
      }
    }
    if (updateData.username && updateData.username !== user.username) {
      const existingUsernameUser = await db.User.findOne({ where: { username: updateData.username } });
      if (existingUsernameUser && existingUsernameUser.id !== id) {
        throw new AppError(`User with username '${updateData.username}' already exists.`, 409);
      }
    }

    Object.assign(user, updateData);
    await user.save();

    logger.info(`User updated: ${user.email} (ID: ${id})`);
    return user;
  }

  /**
   * Deletes a user by their ID (soft delete).
   * @param {string} id - User ID.
   * @returns {boolean} True if deletion was successful.
   * @throws {AppError} If user not found.
   */
  async deleteUser(id) {
    const user = await db.User.findByPk(id, { paranoid: true });

    if (!user) {
      throw new AppError(`User with ID ${id} not found.`, 404);
    }

    await user.destroy(); // Soft delete

    logger.info(`User soft-deleted: ${user.email} (ID: ${id})`);
    return true;
  }

  /**
   * Restores a soft-deleted user by their ID.
   * @param {string} id - User ID.
   * @returns {object} The restored user.
   * @throws {AppError} If user not found or not deleted.
   */
  async restoreUser(id) {
    // Find in both active and deleted records
    const user = await db.User.findByPk(id, { paranoid: false });

    if (!user) {
      throw new AppError(`User with ID ${id} not found.`, 404);
    }

    if (!user.deletedAt) {
      throw new AppError(`User with ID ${id} is not soft-deleted.`, 400);
    }

    await user.restore(); // Restore soft-deleted record
    logger.info(`User restored: ${user.email} (ID: ${id})`);
    return user;
  }
}

module.exports = new UserService();
```