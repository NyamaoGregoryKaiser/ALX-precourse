```javascript
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const orderService = require('../services/order.service');
const logger = require('../utils/logger');

/**
 * Creates a new order.
 * Users can create orders for themselves. Admins can create orders for any user.
 */
const createOrder = catchAsync(async (req, res) => {
  const userId = req.user.role === 'admin' && req.body.userId ? req.body.userId : req.user.id;
  const orderBody = { ...req.body, userId };

  const order = await orderService.createOrder(orderBody);
  logger.info(`User (ID: ${req.user.id}, Role: ${req.user.role}) created order (ID: ${order.id}) for user ID: ${order.userId}`);
  res.status(httpStatus.CREATED).send(order);
});

/**
 * Retrieves multiple orders with pagination and filtering.
 * Admins can retrieve all orders. Users can only retrieve their own orders.
 */
const getOrders = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Apply user-specific filter if not an admin
  if (req.user.role === 'user') {
    filter.userId = req.user.id;
  }

  const result = await orderService.queryOrders(filter, options);
  logger.debug(`User (ID: ${req.user.id}) fetched orders with filter: ${JSON.stringify(filter)}`);
  res.send(result);
});

/**
 * Retrieves a single order by ID.
 * Admins can retrieve any order. Users can only retrieve their own orders.
 */
const getOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.orderId);

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Enforce ownership for regular users
  if (req.user.role === 'user' && order.userId !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only view your own orders');
  }

  logger.debug(`User (ID: ${req.user.id}) fetched order with ID: ${order.id}`);
  res.send(order);
});

/**
 * Updates an order by ID.
 * Admins can update any aspect of an order. Users can only update their own order to 'cancelled' status.
 */
const updateOrder = catchAsync(async (req, res) => {
  let updateBody = req.body;
  const orderId = req.params.orderId;

  const order = await orderService.getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (req.user.role === 'user') {
    if (order.userId !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only update your own orders');
    }
    // Users can only cancel their own orders, and only if it's pending.
    // They cannot change quantity or other details.
    if (updateBody.status && updateBody.status !== 'cancelled') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Users can only cancel their own pending orders.');
    }
    if (updateBody.quantity) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Users cannot change order quantity.');
    }
    if (order.status !== 'pending') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Only pending orders can be cancelled.');
    }
    updateBody = { status: 'cancelled' }; // Ensure only status can be updated to cancelled
  }

  const updatedOrder = await orderService.updateOrderById(orderId, updateBody);
  logger.info(`User (ID: ${req.user.id}, Role: ${req.user.role}) updated order with ID: ${updatedOrder.id}`);
  res.send(updatedOrder);
});

/**
 * Deletes an order by ID. Only accessible by admins.
 */
const deleteOrder = catchAsync(async (req, res) => {
  await orderService.deleteOrderById(req.params.orderId);
  logger.info(`Admin (ID: ${req.user.id}) deleted order with ID: ${req.params.orderId}`);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
};
```