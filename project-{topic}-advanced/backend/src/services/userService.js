const { User, Project, Task } = require('../models');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

const USER_CACHE_KEY = 'all_users';

const getUsers = async () => {
  const cachedUsers = cache.get(USER_CACHE_KEY);
  if (cachedUsers) {
    return cachedUsers;
  }

  const users = await User.findAll({
    attributes: { exclude: ['password'] }
  });
  cache.set(USER_CACHE_KEY, users);
  return users;
};

const getUserById = async (id) => {
  const cachedUser = cache.get(`${USER_CACHE_KEY}_${id}`);
  if (cachedUser) {
    return cachedUser;
  }

  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Project,
        as: 'ownedProjects',
        attributes: ['id', 'name', 'status']
      },
      {
        model: Task,
        as: 'assignedTasks',
        attributes: ['id', 'title', 'status', 'dueDate']
      }
    ]
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }
  cache.set(`${USER_CACHE_KEY}_${id}`, user);
  return user;
};

const updateUser = async (id, userData) => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent changing password directly through this method, use a dedicated endpoint if needed
  if (userData.password) {
    throw new AppError('Password cannot be updated directly via this route.', 400);
  }

  Object.assign(user, userData); // Update fields
  await user.save();

  cache.del(USER_CACHE_KEY); // Invalidate all users cache
  cache.del(`${USER_CACHE_KEY}_${id}`); // Invalidate specific user cache

  logger.info(`User updated: ${user.id}`);
  return user;
};

const deleteUser = async (id) => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.destroy();
  cache.del(USER_CACHE_KEY);
  cache.del(`${USER_CACHE_KEY}_${id}`);
  logger.info(`User deleted: ${id}`);
  return { message: 'User deleted successfully' };
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
```

### `backend/src/services/projectService.js` (Project Business Logic)
```javascript