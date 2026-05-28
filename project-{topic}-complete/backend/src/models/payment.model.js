```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define('Payment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        orderId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true, // One payment per order (for simplicity, can be multiple if needed)
            references: {
                model: 'orders',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                isDecimal: true,
                min: {
                    args: [0],
                    msg: 'Amount must be a positive number.'
                }
            }
        },
        paymentMethod: {
            type: DataTypes.ENUM('credit_card', 'paypal', 'bank_transfer', 'stripe'), // Example methods
            allowNull: false
        },
        transactionId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true // Unique ID from payment gateway
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
            defaultValue: 'pending',
            allowNull: false
        }
    }, {
        tableName: 'payments',
        timestamps: true
    });

    Payment.associate = (models) => {
        Payment.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    };

    return Payment;
};
```