```javascript
const jwt = require('../utils/jwt');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { User } = require('../db/models');

exports.authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in! Please log in to get access.', 401);
    }

    // 1) Verify token
    const decoded = jwt.verifyAccessToken(token);

    // 2) Check if user still exists
    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    // 3) Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${error.message}`);
    next(error);
  }
};
```