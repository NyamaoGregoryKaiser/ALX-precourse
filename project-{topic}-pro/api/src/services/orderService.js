```javascript
const httpStatus = require('http-status');
const { Order, OrderItem, Product, User, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { ORDER_STATUS, PRODUCT_AVAILABILITY } = require('../config/constants');
const { DEFAULT_PAGE_SIZE } = require('../config/constants');

/**
 * Create an order
 * @param {UUID} userId
 * @param {Array<Object>} items - Array of { productId, quantity }
 * @param {Object} shippingAddress - { street, city, state, zipCode, country }
 * @param {Object} [billingAddress]
 * @param {string} paymentMethod
 * @returns {Promise<Order>}
 */
const createOrder = async (userId, items, shippingAddress, billingAddress, paymentMethod) => {
  if (!items || items.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order must contain at least one item');
  }

  const transaction = await sequelize.transaction();
  try {
    let totalAmount = 0;
    const orderItemsData = [];
    const productUpdates = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction });

      if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, `Product with ID ${item.productId} not found`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Not enough stock for product "${product.name}". Available: ${product.stockQuantity}`);
      }
      if (product.availability === PRODUCT_AVAILABILITY.OUT_OF_STOCK) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Product "${product.name}" is currently out of stock.`);
      }

      const itemPrice = parseFloat(product.price);
      totalAmount += itemPrice * item.quantity;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        productName: product.name,
        productImageUrl: product.imageUrl,
      });

      // Prepare to reduce stock quantity
      productUpdates.push({
        product: product,
        newStock: product.stockQuantity - item.quantity,
      });
    }

    // Create the order
    const order = await Order.create({
      userId,
      totalAmount: totalAmount,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress, // Default billing to shipping if not provided
      paymentMethod,
      status: ORDER_STATUS.PENDING,
      paymentStatus: 'unpaid', // Initial payment status
    }, { transaction });

    // Create order items
    const orderItemsWithOrderId = orderItemsData.map((item) => ({ ...item, orderId: order.id }));
    await OrderItem.bulkCreate(orderItemsWithOrderId, { transaction });

    // Update product stock quantities
    for (const update of productUpdates) {
      update.product.stockQuantity = update.newStock;
      await update.product.save({ transaction });
    }

    await transaction.commit();
    logger.info(`Order ${order.orderNumber} created successfully for user ${userId}. Total: ${totalAmount}`);
    return order;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Failed to create order for user ${userId}: ${error.message}`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create order due to an unexpected error.');
  }
};

/**
 * Query for orders
 * @param {Object} filter - Filter options (e.g., { userId: 'uuid', status: 'pending' })
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [options.populate] - Populate related models (e.g., 'user,orderItems.product')
 * @returns {Promise<QueryResult>}
 */
const queryOrders = async (filter, options) => {
  const { limit = DEFAULT_PAGE_SIZE, page = 1, sortBy, populate } = options;
  const offset = (page - 1) * limit;

  const order = [];
  if (sortBy) {
    const [field, sortOrder] = sortBy.split(':');
    order.push([field, sortOrder.toUpperCase()]);
  } else {
    order.push(['createdAt', 'DESC']); // Default sort
  }

  const include = [];
  if (populate && populate.includes('user')) {
    include.push({
      model: User,
      as: 'user',
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });
  }
  if (populate && populate.includes('orderItems')) {
    include.push({
      model: OrderItem,
      as: 'orderItems',
      include: populate.includes('orderItems.product') ? [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl'] }] : [],
    });
  }

  const where = {};
  if (filter.userId) {
    where.userId = filter.userId;
  }
  if (filter.status) {
    where.status = filter.status;
  }
  // Add more filters as needed

  const orders = await Order.findAndCountAll({
    where,
    limit,
    offset,
    order,
    include,
    distinct: true, // Crucial for accurate count with includes that can create duplicate rows
  });

  return {
    results: orders.rows,
    totalResults: orders.count,
    page,
    limit,
    totalPages: Math.ceil(orders.count / limit),
  };
};

/**
 * Get order by ID
 * @param {UUID} orderId
 * @returns {Promise<Order>}
 */
const getOrderById = async (orderId) => {
  return Order.findByPk(orderId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
      {
        model: OrderItem,
        as: 'orderItems',
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl'] }],
      },
    ],
  });
};

/**
 * Update order status
 * @param {UUID} orderId
 * @param {string} newStatus
 * @returns {Promise<Order>}
 */
const updateOrderStatus = async (orderId, newStatus) => {
  if (!Object.values(ORDER_STATUS).includes(newStatus)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid order status');
  }

  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Implement state transition logic if needed (e.g., cannot go from DELIVERED to PENDING)
  // For simplicity, directly update for now.
  order.status = newStatus;

  if (newStatus === ORDER_STATUS.SHIPPED && !order.shippedAt) {
    order.shippedAt = new Date();
  }
  if (newStatus === ORDER_STATUS.DELIVERED && !order.deliveredAt) {
    order.deliveredAt = new Date();
  }

  await order.save();
  logger.info(`Order ${order.orderNumber} status updated to ${newStatus}.`);
  return order;
};

/**
 * Update order payment status
 * @param {UUID} orderId
 * @param {string} newPaymentStatus
 * @returns {Promise<Order>}
 */
const updateOrderPaymentStatus = async (orderId, newPaymentStatus) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Basic validation for payment status
  const validPaymentStatuses = ['unpaid', 'paid', 'refunded', 'failed'];
  if (!validPaymentStatuses.includes(newPaymentStatus)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid payment status');
  }

  order.paymentStatus = newPaymentStatus;
  await order.save();
  logger.info(`Order ${order.orderNumber} payment status updated to ${newPaymentStatus}.`);
  return order;
};


/**
 * Cancel an order
 * @param {UUID} orderId
 * @returns {Promise<Order>}
 */
const cancelOrder = async (orderId) => {
  const transaction = await sequelize.transaction();
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    }

    if (order.status === ORDER_STATUS.DELIVERED || order.status === ORDER_STATUS.CANCELLED) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Order cannot be cancelled in "${order.status}" status.`);
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.paymentStatus = 'refunded'; // Assuming refund on cancellation

    await order.save({ transaction });

    // Restore product stock
    const orderItems = await OrderItem.findAll({ where: { orderId: order.id }, transaction });
    for (const item of orderItems) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (product) {
        product.stockQuantity += item.quantity;
        // Optionally update product availability if it was out of stock
        if (product.stockQuantity > 0 && product.availability === PRODUCT_AVAILABILITY.OUT_OF_STOCK) {
          product.availability = PRODUCT_AVAILABILITY.IN_STOCK;
        }
        await product.save({ transaction });
      }
    }

    await transaction.commit();
    logger.info(`Order ${order.orderNumber} cancelled successfully. Stock restored.`);
    return order;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Failed to cancel order ${orderId}: ${error.message}`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to cancel order due to an unexpected error.');
  }
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderPaymentStatus,
  cancelOrder,
};
```