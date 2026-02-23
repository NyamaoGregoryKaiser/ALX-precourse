```javascript
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getUsers = async () => {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) {
    throw new AppError(404, 'User not found.');
  }
  return user;
};

const updateUser = async (id, updateData) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  // If password is being updated, hash it
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 12);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  });

  logger.info(`User updated: ${updatedUser.email}`);
  return updatedUser;
};

const deleteUser = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  await prisma.user.delete({ where: { id } });
  logger.info(`User deleted: ${user.email}`);
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
```