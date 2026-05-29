```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { ROLES } = require('../config/constants');
const { hashPassword } = require('../utils/password');
const logger = require('../config/logger');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50],
    },
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      // Hash password automatically before saving
      this.setDataValue('password', hashPassword(value));
    },
  },
  role: {
    type: DataTypes.ENUM(Object.values(ROLES)),
    defaultValue: ROLES.USER,
    allowNull: false,
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true, // Basic URL validation
    },
  },
}, {
  tableName: 'users', // Explicitly define table name
  hooks: {
    beforeCreate: async (user) => {
      // Password hashing is handled by the setter, but this hook ensures it if
      // direct `setDataValue` is bypassed or for consistency.
      if (user.changed('password')) {
        user.password = await hashPassword(user.password);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await hashPassword(user.password);
      }
    },
    afterCreate: (user, options) => {
      logger.info(`User created: ${user.email}`);
    },
  },
});

// Instance method to check password validity
User.prototype.isPasswordMatch = async function (password) {
  // Use bcrypt.compare for asynchronous password comparison
  const bcrypt = require('bcryptjs'); // Require here to avoid circular dependency with utils/password
  return bcrypt.compare(password, this.password);
};

module.exports = User;
```