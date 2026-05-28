```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT' // Don't delete orders if user is deleted, maybe anonymize
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                isDecimal: true,
                min: {
                    args: [0],
                    msg: 'Total amount must be a positive number.'
                }
            }
        },
        status: {
            type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
            defaultValue: 'pending',
            allowNull: false
        },
        shippingAddress: {
            type: DataTypes.STRING,
            allowNull: false
        },
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
            defaultValue: 'pending',
            allowNull: false
        }
    }, {
        tableName: 'orders',
        timestamps: true
    });

    Order.associate = (models) => {
        Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
        Order.belongsToMany(models.Product, { through: models.OrderItem, foreignKey: 'orderId', as: 'products' });
        Order.hasOne(models.Payment, { foreignKey: 'orderId', as: 'payment' });
    };

    return Order;
};
```