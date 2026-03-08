```javascript
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../src/utils/constants');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
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
      validate: {
        min: 8,
      },
      private: true, // used by toJSON plugin
    },
    role: {
      type: DataTypes.ENUM(USER_ROLES.USER, USER_ROLES.ADMIN),
      defaultValue: USER_ROLES.USER,
      allowNull: false,
    },
  }, {
    timestamps: true,
    // Hooks to hash password before saving
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  });

  /**
   * Check if email is taken
   * @param {string} email - The user's email
   * @param {UUID} [excludeUserId] - The id of the user to be excluded
   * @returns {Promise<boolean>}
   */
  User.isEmailTaken = async function (email, excludeUserId) {
    const user = await this.findOne({ where: { email, id: { [DataTypes.Op.ne]: excludeUserId } } });
    return !!user;
  };

  /**
   * Check if password matches the user's password
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  User.prototype.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  User.associate = (models) => {
    User.hasMany(models.Account, {
      foreignKey: 'userId',
      as: 'accounts',
    });
    User.hasMany(models.Transaction, {
      foreignKey: 'userId',
      as: 'transactions',
    });
  };

  return User;
};
```