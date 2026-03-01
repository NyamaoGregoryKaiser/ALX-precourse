```javascript
// src/models/user.model.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const paginate = require('./plugins/paginate.plugin');
const toJSON = require('./plugins/toJSON.plugin');
const { tokenTypes } = require('../config/tokens');

module.exports = (sequelize) => {
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
            trim: true,
            min: 8,
            validate: {
                // ALX Principle: Secure Password Policy
                // Enforce strong passwords (e.g., min length, complexity).
                isLongEnough(value) {
                    if (value.length < 8) {
                        throw new Error('Password must be at least 8 characters');
                    }
                },
                isComplexEnough(value) {
                    if (!value.match(/\d/) || !value.match(/[A-Z]/) || !value.match(/[a-z]/) || !value.match(/[^a-zA-Z0-9]/)) {
                        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
                    }
                }
            },
            private: true, // Used by the toJSON plugin
        },
        role: {
            type: DataTypes.ENUM('user', 'admin'),
            defaultValue: 'user',
        },
        isEmailVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        timestamps: true,
        tableName: 'users',
        hooks: {
            // ALX Principle: Password Hashing
            // Use hooks to hash passwords before saving them to the database.
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
    });

    // Attach plugins
    User.paginate = paginate;
    User.toJSON = toJSON; // Note: toJSON is typically a prototype method, this is a simplified usage

    /**
     * Check if email is taken
     * @param {string} email - The user's email
     * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
     * @returns {Promise<boolean>}
     */
    User.isEmailTaken = async function (email, excludeUserId) {
        const user = await this.findOne({ where: { email, id: { [sequelize.Op.ne]: excludeUserId } } });
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

    User.associate = (models) => {
        User.hasMany(models.Token, { foreignKey: 'userId', as: 'tokens', onDelete: 'CASCADE' });
    };

    return User;
};
```