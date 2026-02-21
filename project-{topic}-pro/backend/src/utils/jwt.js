const jwt = require('jsonwebtoken');
const config = require('../config/config');

exports.generateToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// No need for a verifyToken function here, as `promisify(jwt.verify)` is used directly in auth middleware.