```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Cart = sequelize.define('Cart', {
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
            unique: true, // A user should only have one cart
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'carts',
        timestamps: true
    });

    Cart.associate = (models) => {
        Cart.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        Cart.hasMany(models.CartItem, { foreignKey: 'cartId', as: 'cartItems' });
        Cart.belongsToMany(models.Product, { through: models.CartItem, foreignKey: 'cartId', as: 'products' });
    };

    return Cart;
};
```