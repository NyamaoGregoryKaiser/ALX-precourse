```javascript
const httpStatus = require('http-status');
const userService = require('./user.service');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  // Use 'withPassword' scope to retrieve the hashed password for comparison
  const user = await User.scope('withPassword').findOne({ where: { email } });
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

// Add more auth-related services like token verification, refresh token generation, password reset etc.
// For brevity, these are not fully implemented but would follow similar patterns.

module.exports = {
  loginUserWithEmailAndPassword,
};
```