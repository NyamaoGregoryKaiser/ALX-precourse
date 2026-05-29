```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../config/logger');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // Each user has one cart
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      isInt: true,
      min: 1,
    },
  },
  price: { // Price at the time item was added to cart
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0,
    },
  },
}, {
  tableName: 'carts',
  indexes: [
    {
      fields: ['userId'],
      unique: false, // User can have multiple items in cart, but only one "cart" record per user per product
    },
    {
      fields: ['productId'],
    },
    {
      unique: true,
      fields: ['userId', 'productId'] // Ensure only one entry per product per user
    }
  ],
  hooks: {
    afterCreate: (cartItem, options) => {
      logger.debug(`Cart item added: User ${cartItem.userId}, Product ${cartItem.productId}, Quantity ${cartItem.quantity}`);
    },
    afterUpdate: (cartItem, options) => {
      if (cartItem.changed('quantity')) {
        logger.debug(`Cart item updated: User ${cartItem.userId}, Product ${cartItem.productId}, New Quantity ${cartItem.quantity}`);
      }
    },
    afterDestroy: (cartItem, options) => {
      logger.debug(`Cart item removed: User ${cartItem.userId}, Product ${cartItem.productId}`);
    },
  },
});

module.exports = Cart;
```