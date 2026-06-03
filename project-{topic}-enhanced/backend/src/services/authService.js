```javascript
const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/crypt');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const registerUser = async (userData) => {
  const { email, password, name, type } = userData;

  // 1. Check if user already exists
  const existingUser = await db('users').where({ email }).first();
  if (existingUser) {
    throw new AppError('User with that email already exists.', 409, 'DUPLICATE_EMAIL');
  }

  // 2. Hash password
  const hashedPassword = await hashPassword(password);

  // 3. Insert user into DB
  const newUser = {
    id: require('uuid').v4(), // Generate UUID
    name,
    email,
    password: hashedPassword,
    type: type || 'user',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db('users').insert(newUser);

  // If user is registering as a merchant, create a merchant entry and link it
  let merchant;
  if (newUser.type === 'merchant') {
    merchant = {
      id: require('uuid').v4(),
      user_id: newUser.id,
      name: `${name}'s Merchant Account`,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db('merchants').insert(merchant);
    await db('users').where({ id: newUser.id }).update({ merchant_id: merchant.id });
  }

  // 4. Generate JWT token
  const token = signToken({ id: newUser.id, type: newUser.type });

  logger.info(`New ${newUser.type} registered: ${newUser.email}`);

  // Return user data (without password) and token
  const { password: _, ...userWithoutPassword } = newUser;
  return { user: userWithoutPassword, token };
};

const loginUser = async (email, password) => {
  // 1. Check if user exists
  const user = await db('users').where({ email }).first();
  if (!user || user.status !== 'active') {
    throw new AppError('Invalid credentials or account is not active.', 401, 'INVALID_CREDENTIALS');
  }

  // 2. Compare password
  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  // 3. Generate JWT token
  const token = signToken({ id: user.id, type: user.type });

  logger.info(`User logged in: ${user.email}`);

  // Return user data (without password) and token
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

module.exports = {
  registerUser,
  loginUser,
};
```