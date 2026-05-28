```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const OrderItem = sequelize.define('OrderItem', {
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
            references: {
                model: 'orders',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT' // Don't delete products if they are part of an order
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: [1],
                    msg: 'Quantity must be at least 1.'
                }
            }
        },
        price: { // Price at the time of order
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    }, {
        tableName: 'order_items',
        timestamps: true,
        uniqueKeys: {
            order_item_unique: {
                fields: ['orderId', 'productId']
            }
        }
    });

    OrderItem.associate = (models) => {
        OrderItem.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
        OrderItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    };

    return OrderItem;
};
```