```javascript
// src/models/token.model.js
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { tokenTypes } = require('../config/tokens');

module.exports = (sequelize) => {
    const Token = sequelize.define('Token', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
        },
        token: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        type: {
            type: DataTypes.ENUM(tokenTypes.REFRESH, tokenTypes.RESET_PASSWORD, tokenTypes.VERIFY_EMAIL),
            allowNull: false,
        },
        expires: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        blacklisted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        timestamps: true,
        tableName: 'tokens',
        indexes: [
            { fields: ['userId'] },
            { fields: ['expires'] },
            { fields: ['blacklisted'] },
        ]
    });

    Token.associate = (models) => {
        Token.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return Token;
};
```