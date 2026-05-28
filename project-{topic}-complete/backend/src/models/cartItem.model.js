```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const CartItem = sequelize.define('CartItem', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        cartId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'carts',
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
            onDelete: 'CASCADE'
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                min: {
                    args: [1],
                    msg: 'Quantity must be at least 1.'
                }
            }
        },
        priceAtAddition: { // Store price at the time of adding to cart
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    }, {
        tableName: 'cart_items',
        timestamps: true,
        uniqueKeys: {
            cart_item_unique: {
                fields: ['cartId', 'productId']
            }
        }
    });

    CartItem.associate = (models) => {
        CartItem.belongsTo(models.Cart, { foreignKey: 'cartId', as: 'cart' });
        CartItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    };

    return CartItem;
};
```