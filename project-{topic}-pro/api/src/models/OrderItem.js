```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1,
    },
  },
  price: { // Price at the time of order
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0,
    },
  },
  // Snapshot of product details at time of order
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'order_items',
  indexes: [
    {
      fields: ['orderId'],
    },
    {
      fields: ['productId'],
    },
  ],
  hooks: {
    beforeValidate: (orderItem, options) => {
      // Ensure quantity and price are positive
      if (orderItem.quantity <= 0) {
        throw new Error('Quantity must be at least 1.');
      }
      if (orderItem.price < 0) {
        throw new Error('Price cannot be negative.');
      }
    },
  },
});

module.exports = OrderItem;
```