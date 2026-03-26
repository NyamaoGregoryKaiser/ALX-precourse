```javascript
const httpStatus = require('http-status');
const { Order, Product, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { Op } = require('sequelize');

/**
 * Create an order
 * @param {object} orderBody
 * @returns {Promise<Order>}
 */
const createOrder = async (orderBody) => {
  const { userId, productId, quantity } = orderBody;

  // Check if user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if product exists and has enough stock
  const product = await Product.findByPk(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  if (product.stock < quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Not enough stock for product "${product.name}". Available: ${product.stock}`);
  }

  // Calculate total price based on current product price
  const totalPrice = product.price * quantity;

  // Create the order
  const order = await Order.create({
    userId,
    productId,
    quantity,
    totalPrice,
    status: 'pending',
  });

  // Decrease product stock
  product.stock -= quantity;
  await product.save();

  return order;
};

/**
 * Query for orders with pagination, sorting, and filtering.
 * @param {object} filter - Filter options (e.g., { userId: 1, status: 'pending' })
 * @param {object} options - Pagination and sorting options (e.g., { sortBy: 'createdAt:desc', limit: 10, page: 1 })
 * @returns {Promise<QueryResult>}
 */
const queryOrders = async (filter, options) => {
  const { sortBy, limit = 10, page = 1 } = options;
  const offset = (page - 1) * limit;

  const where = {};
  if (filter.userId) {
    where.userId = filter.userId;
  }
  if (filter.status) {
    where.status = filter.status;
  }

  const order = [];
  if (sortBy) {
    const parts = sortBy.split(',');
    parts.forEach((part) => {
      const [key, direction] = part.split(':');
      if (key && direction) {
        order.push([key, direction.toUpperCase()]);
      }
    });
  } else {
    order.push(['createdAt', 'DESC']); // Default sort
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    order,
    limit,
    offset,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }, { model: Product, as: 'product', attributes: ['id', 'name', 'price'] }],
  });

  return {
    results: rows,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(count / limit),
    totalResults: count,
  };
};

/**
 * Get order by ID
 * @param {number} id
 * @returns {Promise<Order>}
 */
const getOrderById = async (id) => {
  return Order.findByPk(id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }, { model: Product, as: 'product', attributes: ['id', 'name', 'price'] }],
  });
};

/**
 * Update order by ID
 * @param {number} orderId
 * @param {object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (orderId, updateBody) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Prevent changing product or user of an existing order directly
  if (updateBody.productId || updateBody.userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot change product or user for an existing order.');
  }

  // Handle quantity update and stock adjustment
  if (updateBody.quantity && updateBody.quantity !== order.quantity) {
    const product = await Product.findByPk(order.productId);
    if (!product) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Associated product not found');
    }

    const quantityDifference = updateBody.quantity - order.quantity;
    if (product.stock < quantityDifference) { // If increasing quantity, check stock
      throw new ApiError(httpStatus.BAD_REQUEST, `Not enough stock. Available: ${product.stock}`);
    }

    // Update product stock
    product.stock -= quantityDifference;
    await product.save();
    // Recalculate total price
    updateBody.totalPrice = product.price * updateBody.quantity;
  }

  Object.assign(order, updateBody);
  await order.save();
  return order;
};

/**
 * Delete order by ID
 * @param {number} orderId
 * @returns {Promise<Order>}
 */
const deleteOrderById = async (orderId) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Restore product stock if order was not completed/cancelled
  if (order.status === 'pending') {
    const product = await Product.findByPk(order.productId);
    if (product) {
      product.stock += order.quantity;
      await product.save();
    }
  }

  await order.destroy();
  return order;
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
  updateOrderById,
  deleteOrderById,
};
```