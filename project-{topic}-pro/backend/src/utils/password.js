```javascript
// This file is conceptually where password hashing/comparison might be if it wasn't a method on the User model.
// For this project, `User.pre('save')` and `User.methods.matchPassword()` handle this.
// This file exists to demonstrate separation of concerns if desired.

const bcrypt = require('bcryptjs');
const { CustomError } = require('./error');

/**
 * Hashes a plain-text password.
 * @param {string} password - The plain-text password.
 * @returns {Promise<string>} The hashed password.
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compares a plain-text password with a hashed password.
 * @param {string} enteredPassword - The plain-text password entered by the user.
 * @param {string} hashedPassword - The hashed password from the database.
 * @returns {Promise<boolean>} True if passwords match, false otherwise.
 */
const comparePasswords = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

module.exports = { hashPassword, comparePasswords };

// Note: In this project, `User.js` model handles password hashing and comparison
// as methods on the schema directly. This file demonstrates how these utilities
// could be externalized for broader use or if not tied to a Mongoose model.
```