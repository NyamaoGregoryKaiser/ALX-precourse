```javascript
// src/models/idempotencyKey.model.js
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const paginate = require('./plugins/paginate.plugin');
const toJSON = require('./plugins/toJSON.plugin');

module.exports = (sequelize) => {
    const IdempotencyKey = sequelize.define('IdempotencyKey', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
        },
        key: {
            type: DataTypes.STRING, // The actual X-Idempotency-Key header value
            allowNull: false,
            unique: 'idempotency_unique_key_per_merchant', // Composite unique key
        },
        merchantId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: 'idempotency_unique_key_per_merchant', // Composite unique key
            references: {
                model: 'merchants',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        requestHash: {
            type: DataTypes.STRING, // Hash of the request body to ensure identical requests
            allowNull: false,
        },
        requestMethod: {
            type: DataTypes.STRING(10), // e.g., POST, PUT
            allowNull: false,
        },
        requestPath: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        requestBody: {
            type: DataTypes.JSONB, // Store full request body for debugging/auditing
            allowNull: true,
        },
        responseStatusCode: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        responseBody: {
            type: DataTypes.JSONB, // Store the response body to return for idempotent requests
            allowNull: false,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    }, {
        timestamps: true,
        tableName: 'idempotency_keys',
        indexes: [
            { fields: ['key', 'merchantId'], unique: true }, // Ensure uniqueness per merchant
            { fields: ['expiresAt'] }, // For efficient cleanup of expired keys
        ]
    });

    IdempotencyKey.paginate = paginate;
    IdempotencyKey.toJSON = toJSON;

    IdempotencyKey.associate = (models) => {
        IdempotencyKey.belongsTo(models.Merchant, { foreignKey: 'merchantId', as: 'merchant' });
    };

    return IdempotencyKey;
};
```