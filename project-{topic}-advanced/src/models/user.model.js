```javascript
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      private: true, // Used to hide the password field in JSON responses
      validate: {
        len: [8, 128], // Min 8, Max 128 characters
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false,
    },
  }, {
    timestamps: true,
    // Add a scope to exclude password by default
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: {}, // No exclusion, includes all attributes
      },
    },
  });

  // Hash password before saving if it's new or modified
  User.beforeSave(async (user, options) => {
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  /**
   * Check if entered password matches user's hashed password.
   * @param {string} password - The password to check.
   * @returns {Promise<boolean>} - True if passwords match, false otherwise.
   */
  User.prototype.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  /**
   * Check if email is already taken.
   * @param {string} email - The email to check.
   * @param {number} [excludeUserId] - The ID of the user to exclude from the check (for update scenarios).
   * @returns {Promise<boolean>} - True if email is taken, false otherwise.
   */
  User.isEmailTaken = async function (email, excludeUserId) {
    const user = await this.findOne({ where: { email, id: { [DataTypes.Op.ne]: excludeUserId } } });
    return !!user;
  };

  return User;
};
```