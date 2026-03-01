```javascript
// src/models/merchant.model.js
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const paginate = require('./plugins/paginate.plugin');
const toJSON = require('./plugins/toJSON.plugin');

module.exports = (sequelize) => {
    const Merchant = sequelize.define('Merchant', {
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
        businessCategory: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        apiKey: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            private: true, // Ensures API key is not returned in public API responses by toJSON
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        // ALX Principle: Auditing and Tracking
        // Add fields for tracking important changes.
        lastApiKeyRotation: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        timestamps: true,
        tableName: 'merchants',
    });

    // Attach plugins
    Merchant.paginate = paginate;
    Merchant.toJSON = toJSON;

    /**
     * Check if email is taken
     * @param {string} email - The merchant's email
     * @param {ObjectId} [excludeMerchantId] - The id of the merchant to be excluded
     * @returns {Promise<boolean>}
     */
    Merchant.isEmailTaken = async function (email, excludeMerchantId) {
        const merchant = await this.findOne({ where: { email, id: { [sequelize.Op.ne]: excludeMerchantId } } });
        return !!merchant;
    };

    Merchant.associate = (models) => {
        Merchant.hasMany(models.Transaction, { foreignKey: 'merchantId', as: 'transactions', onDelete: 'SET NULL' });
        Merchant.hasMany(models.WebhookConfig, { foreignKey: 'merchantId', as: 'webhookConfigs', onDelete: 'CASCADE' });
        Merchant.hasMany(models.IdempotencyKey, { foreignKey: 'merchantId', as: 'idempotencyKeys', onDelete: 'CASCADE' });
    };

    return Merchant;
};
```