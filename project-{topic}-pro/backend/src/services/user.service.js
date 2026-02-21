const { User } = require('../db/sequelize');
const logger = require('../utils/logger');

exports.getAllUsers = async () => {
  // Exclude sensitive information like passwordHash
  const users = await User.findAll({
    attributes: { exclude: ['passwordHash'] },
    order: [['createdAt', 'DESC']],
  });
  return users;
};

exports.getUserById = async (id) => {
  // Exclude sensitive information
  const user = await User.findByPk(id, {
    attributes: { exclude: ['passwordHash'] },
  });
  return user;
};