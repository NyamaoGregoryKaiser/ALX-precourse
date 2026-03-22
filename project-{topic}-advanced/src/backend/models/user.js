```javascript
'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');
const { StatusCodes } = require('http-status-codes');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    async comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    }
  }
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Email address already in use!'
      },
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address!'
        },
        notEmpty: {
          msg: 'Email cannot be empty!'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [8],
          msg: 'Password must be at least 8 characters long!'
        },
        notEmpty: {
          msg: 'Password cannot be empty!'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false,
      validate: {
        isIn: {
          args: [['user', 'admin']],
          msg: 'Role must be either "user" or "admin"'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    defaultScope: {
      attributes: { exclude: ['password'] }
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] }
      }
    },
    hooks: {
      beforeCreate: async (user) => {
        user.id = uuidv4(); // Ensure UUID is generated
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        // If password is being updated, hash it
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      // Prevent normal users from creating or updating themselves to admin role
      beforeValidate: (user, options) => {
        if (user.isNewRecord) { // Only on create
          if (user.role && user.role === 'admin' && !options.context?.isAdminCreation) {
            throw new AppError('Unauthorized attempt to set admin role.', StatusCodes.FORBIDDEN);
          }
        } else if (user.changed('role')) { // On update
          // This hook won't have req.user directly. Role authorization should be handled in controller/middleware.
          // This is a safety net if a controller passes a role update directly.
          // However, for update, the `req.user` context is critical and handled in userController.updateUser.
          // For simplicity in hooks, assume context.req.user.role is available or use a flag.
          // For a production-grade app, consider a custom validator that takes context.
          if (user.role === 'admin' && options.context && !options.context.currentUser?.isAdmin) {
             throw new AppError('Only administrators can change roles to "admin".', StatusCodes.FORBIDDEN);
          }
        }
      }
    }
  });
  return User;
};
```