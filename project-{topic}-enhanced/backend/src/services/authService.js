```javascript
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const AppError = require('../utils/appError');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const register = async (name, email, password, role = 'MEMBER') => {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(400, 'User with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    logger.info(`User registered: ${user.email}`);
    return user;
  } catch (error) {
    logger.error(`Error during user registration: ${error.message}`);
    throw error;
  }
};

const login = async (email, password) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(401, 'Incorrect email or password.');
    }

    const token = generateToken(user.id, [user.role]);

    logger.info(`User logged in: ${user.email}`);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    logger.error(`Error during user login: ${error.message}`);
    throw error;
  }
};

module.exports = {
  register,
  login,
};
```