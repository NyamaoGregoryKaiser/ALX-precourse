```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // This is the table name, not the model name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Products', // This is the table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT', // Prevent deleting product if orders exist
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false,
    },
  }, {
    timestamps: true,
    hooks: {
      // Before creating or updating an order, calculate total price based on current product price
      beforeValidate: async (order, options) => {
        if (order.changed('productId') || order.changed('quantity')) {
          const Product = sequelize.models.Product;
          const product = await Product.findByPk(order.productId);
          if (product) {
            order.totalPrice = product.price * order.quantity;
          } else {
            throw new Error('Product not found for order');
          }
        }
      },
    },
  });

  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Order.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
  };

  return Order;
};
```