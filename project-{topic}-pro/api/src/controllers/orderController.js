```javascript
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { orderService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const { ROLES, ORDER_STATUS } = require('../config/constants');

/**
 * Create a new order
 */
const createOrder = catchAsync(async (req, res) => {
  // Ensure the order is made by the authenticated user
  const userId = req.user.id;
  const { items, shippingAddress, billingAddress, paymentMethod } = req.body;
  const order = await orderService.createOrder(userId, items, shippingAddress, billingAddress, paymentMethod);
  res.status(httpStatus.CREATED).send(order);
});

/**
 * Get user's orders or all orders (admin)
 */
const getOrders = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status', 'paymentStatus']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  // If not admin, restrict to own orders
  if (req.user.role !== ROLES.ADMIN) {
    filter.userId = req.user.id;
  } else if (req.query.userId) { // Admin can filter by any user's ID
    filter.userId = req.query.userId;
  }

  const result = await orderService.queryOrders(filter, options);
  res.send(result);
});

/**
 * Get order by ID
 */
const getOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Ensure user can only view their own orders unless they are an admin
  if (order.userId !== req.user.id && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only view your own orders.');
  }

  res.send(order);
});

/**
 * Update order status (Admin only)
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const { status } = req.body; // New status
  const order = await orderService.updateOrderStatus(req.params.orderId, status);
  res.send(order);
});

/**
 * Update order payment status (Admin only, or payment webhook)
 */
const updateOrderPaymentStatus = catchAsync(async (req, res) => {
  const { paymentStatus } = req.body;
  const order = await orderService.updateOrderPaymentStatus(req.params.orderId, paymentStatus);
  res.send(order);
});

/**
 * Cancel an order (User or Admin)
 */
const cancelOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Only the order owner or an admin can cancel
  if (order.userId !== req.user.id && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only cancel your own orders.');
  }

  const cancelledOrder = await orderService.cancelOrder(req.params.orderId);
  res.send(cancelledOrder);
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  cancelOrder,
};
```