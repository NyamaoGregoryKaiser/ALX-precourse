```javascript
// src/models/transaction.model.js
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const paginate = require('./plugins/paginate.plugin');
const toJSON = require('./plugins/toJSON.plugin');

module.exports = (sequelize) => {
    const Transaction = sequelize.define('Transaction', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
        },
        merchantId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'merchants', // refers to table name
                key: 'id',
            },
            onDelete: 'SET NULL', // Or 'RESTRICT' depending on business logic
        },
        amount: {
            type: DataTypes.INTEGER, // Store in smallest currency unit (e.g., cents)
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        currency: {
            type: DataTypes.STRING(3), // e.g., 'USD', 'EUR'
            allowNull: false,
            validate: {
                len: [3, 3],
            },
        },
        status: {
            type: DataTypes.ENUM(
                'pending',
                'authorized',
                'captured',
                'partially_captured', // If partial captures are supported
                'refunded',
                'partially_refunded',
                'failed',
                'voided',
                'disputed'
            ),
            defaultValue: 'pending',
            allowNull: false,
        },
        paymentMethodType: {
            type: DataTypes.ENUM('card', 'bank_transfer', 'mobile_money', 'wallet'),
            allowNull: false,
        },
        gatewayReferenceId: {
            type: DataTypes.STRING, // ID from the external payment gateway
            allowNull: true,
            unique: false, // Not necessarily unique, refunds might generate new ones.
        },
        customerId: {
            type: DataTypes.UUID, // Reference to internal customer ID or external customer ID
            allowNull: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        failureReason: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        gatewayResponse: {
            type: DataTypes.JSONB, // Store the raw response from the payment gateway
            allowNull: true,
        },
        amountCaptured: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        amountRefunded: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        metadata: {
            type: DataTypes.JSONB, // General-purpose metadata field
            allowNull: true,
        },
        idempotencyKey: {
            type: DataTypes.UUID, // Store the idempotency key used for this transaction
            allowNull: true,
            unique: false,
        }
    }, {
        timestamps: true,
        tableName: 'transactions',
        indexes: [
            // ALX Principle: Database Indexing for Performance
            // Optimize query performance for common lookups.
            { fields: ['merchantId'] },
            { fields: ['status'] },
            { fields: ['customerId'] },
            { fields: ['gatewayReferenceId'] },
            { fields: ['idempotencyKey'] },
        ]
    });

    Transaction.paginate = paginate;
    Transaction.toJSON = toJSON;

    Transaction.associate = (models) => {
        Transaction.belongsTo(models.Merchant, { foreignKey: 'merchantId', as: 'merchant' });
        // Can also associate with Customer if a Customer model exists
    };

    return Transaction;
};
```