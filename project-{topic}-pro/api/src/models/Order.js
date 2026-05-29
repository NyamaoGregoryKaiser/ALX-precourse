```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { ORDER_STATUS } = require('../config/constants');
const logger = require('../config/logger');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`, // Simple unique order number
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0,
    },
  },
  status: {
    type: DataTypes.ENUM(Object.values(ORDER_STATUS)),
    defaultValue: ORDER_STATUS.PENDING,
    allowNull: false,
  },
  shippingAddress: {
    type: DataTypes.JSONB, // { street, city, state, zipCode, country }
    allowNull: false,
  },
  billingAddress: {
    type: DataTypes.JSONB,
    allowNull: true, // Can be same as shipping
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentStatus: {
    type: DataTypes.STRING, // e.g., 'paid', 'unpaid', 'refunded'
    defaultValue: 'unpaid',
    allowNull: false,
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shippedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['orderNumber'],
      unique: true,
    },
  ],
  hooks: {
    beforeCreate: (order) => {
      // Ensure totalAmount is calculated if not explicitly set (or validate it)
      if (!order.totalAmount && order.OrderItems) {
        order.totalAmount = order.OrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
    },
    afterCreate: (order, options) => {
      logger.info(`Order created: ${order.orderNumber}, User ID: ${order.userId}, Total: ${order.totalAmount}`);
    },
    afterUpdate: (order, options) => {
      if (order.changed('status')) {
        logger.info(`Order ${order.orderNumber} status changed to ${order.status}`);
      }
      if (order.changed('paymentStatus') && order.paymentStatus === 'paid') {
        logger.info(`Order ${order.orderNumber} successfully paid.`);
        // TODO: Trigger inventory reduction, email confirmation etc.
      }
    },
  },
});

module.exports = Order;
```