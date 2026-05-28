```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Generates a JSON Web Token for a given user ID.
 * @param {string} id - The user's ID.
 * @returns {string} The generated JWT.
 */
const generateToken = (id) => {
    return jwt.sign({ id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

module.exports = { generateToken };
```