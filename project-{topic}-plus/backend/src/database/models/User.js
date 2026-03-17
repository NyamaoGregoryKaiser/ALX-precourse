```javascript
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Username cannot be empty.' },
        len: { args: [3, 50], msg: 'Username must be between 3 and 50 characters.' }
      }
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: { msg: 'Must be a valid email address.' },
        notEmpty: { msg: 'Email cannot be empty.' }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Password cannot be empty.' },
        len: { args: [6, 255], msg: 'Password must be at least 6 characters.' }
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false
    },
    isActivated: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refreshToken: {
      type: DataTypes.STRING(500), // Store refresh token securely, perhaps hashed or as a short-lived token ID
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Enable soft deletes (adds `deletedAt` column)
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
    defaultScope: {
      attributes: { exclude: ['password', 'refreshToken', 'deletedAt'] } // Exclude sensitive fields by default
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] }
      },
      withRefreshToken: {
        attributes: { include: ['refreshToken'] }
      }
    }
  });

  User.prototype.isValidPassword = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  User.associate = (models) => {
    User.hasMany(models.Product, {
      foreignKey: 'userId',
      as: 'products',
      onDelete: 'SET NULL' // If a user is deleted, their products' userId becomes NULL
    });
  };

  return User;
};
```