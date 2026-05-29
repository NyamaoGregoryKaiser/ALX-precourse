```javascript
const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Cart = require('./Cart');
const logger = require('../config/logger');

// Define Associations

// User -> Order (One-to-Many)
User.hasMany(Order, {
  foreignKey: 'userId',
  as: 'orders',
  onDelete: 'CASCADE', // If a user is deleted, their orders are also deleted (adjust as per business logic)
});
Order.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User -> Cart (One-to-Many, but practically One-to-One for the cart itself, One-to-Many for cart items)
User.hasMany(Cart, {
  foreignKey: 'userId',
  as: 'cartItems',
  onDelete: 'CASCADE',
});
Cart.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Product -> Cart (One-to-Many)
Product.hasMany(Cart, {
  foreignKey: 'productId',
  as: 'cartItems',
  onDelete: 'CASCADE', // If a product is deleted, remove it from all carts
});
Cart.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

// Order -> OrderItem (One-to-Many)
Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  as: 'orderItems',
  onDelete: 'CASCADE', // If an order is deleted, its items are also deleted
});
OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

// Product -> OrderItem (One-to-Many)
Product.hasMany(OrderItem, {
  foreignKey: 'productId',
  as: 'orderItems',
  onDelete: 'SET NULL', // If a product is deleted, keep the order item but set productId to NULL
  // Alternatively, use RESTRICT or NO ACTION if historical product data is crucial, or save product snapshot in OrderItem
});
OrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

// Category -> Product (One-to-Many)
Category.hasMany(Product, {
  foreignKey: 'categoryId',
  as: 'products',
  onDelete: 'SET NULL', // If a category is deleted, products in that category become uncategorized
});
Product.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

logger.info('Sequelize models and associations initialized.');

module.exports = {
  User,
  Product,
  Category,
  Order,
  OrderItem,
  Cart,
};
```