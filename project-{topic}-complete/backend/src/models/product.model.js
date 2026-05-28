```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [3, 100],
                    msg: 'Product name must be between 3 and 100 characters.'
                }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                isDecimal: true,
                min: {
                    args: [0],
                    msg: 'Price must be a positive number.'
                }
            }
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isUrl: {
                    msg: 'Must be a valid URL for the image.'
                }
            }
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                isInt: true,
                min: {
                    args: [0],
                    msg: 'Stock must be a non-negative integer.'
                }
            }
        },
        categoryId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'categories', // 'categories' refers to table name
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT' // Prevent deleting categories with existing products
        }
    }, {
        tableName: 'products',
        timestamps: true
    });

    Product.associate = (models) => {
        Product.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
        Product.hasMany(models.Review, { foreignKey: 'productId', as: 'reviews' });
        // Many-to-many through CartItem for Cart, and OrderItem for Order
        Product.belongsToMany(models.Cart, { through: models.CartItem, foreignKey: 'productId', as: 'carts' });
        Product.belongsToMany(models.Order, { through: models.OrderItem, foreignKey: 'productId', as: 'orders' });
    };

    return Product;
};
```