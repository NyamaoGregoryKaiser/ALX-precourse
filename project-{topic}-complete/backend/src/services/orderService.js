```javascript
const { sequelize, Order, OrderItem, Cart, CartItem, Product, Payment } = require('../config/db');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');
const { deleteCache } = require('../utils/cache');
const CartService = require('./cartService'); // Re-use cart service for total calculation

/**
 * Service for Order related business logic.
 */
class OrderService {
    /**
     * Creates a new order from a user's cart.
     * This involves a transaction to ensure data consistency.
     * @param {string} userId - The ID of the user.
     * @param {Object} shippingInfo - Shipping address details.
     * @returns {Object} The created order.
     */
    static async createOrderFromCart(userId, shippingInfo) {
        const t = await sequelize.transaction(); // Start a transaction

        try {
            const cart = await Cart.findOne({
                where: { userId },
                include: [{
                    model: CartItem,
                    as: 'cartItems',
                    include: [{ model: Product, as: 'product' }]
                }]
            });

            if (!cart || cart.cartItems.length === 0) {
                throw new AppError('Cart is empty', 400);
            }

            // Calculate total amount using CartService's helper
            const { totalAmount } = CartService._calculateCartTotal(cart);

            // Check product stock before creating order
            for (const item of cart.cartItems) {
                if (item.product.stock < item.quantity) {
                    throw new AppError(`Not enough stock for ${item.product.name}. Available: ${item.product.stock}`, 400);
                }
            }

            // Create the order
            const order = await Order.create({
                userId,
                totalAmount,
                shippingAddress: shippingInfo.address,
                status: 'pending',
                paymentStatus: 'pending'
            }, { transaction: t });

            // Create order items and update product stock
            const orderItemsData = cart.cartItems.map(item => ({
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.product.price // Store current product price
            }));

            await OrderItem.bulkCreate(orderItemsData, { transaction: t });

            // Update product stock and invalidate product caches
            for (const item of cart.cartItems) {
                await Product.decrement('stock', {
                    by: item.quantity,
                    where: { id: item.productId },
                    transaction: t
                });
                deleteCache(`product_${item.productId}`); // Invalidate single product cache
                deleteCache('all_products'); // Invalidate all products cache (broad)
            }

            // Clear the user's cart
            await CartItem.destroy({
                where: { cartId: cart.id },
                transaction: t
            });
            deleteCache(`cart_${userId}`); // Invalidate user's cart cache

            await t.commit(); // Commit the transaction
            logger.info(`Order ${order.id} created for user ${userId}`);
            return order;

        } catch (error) {
            await t.rollback(); // Rollback transaction if any error occurs
            logger.error(`Failed to create order for user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets a single order by ID for a specific user.
     * @param {string} orderId - ID of the order.
     * @param {string} userId - ID of the user (for authorization).
     * @returns {Object} The order details.
     */
    static async getOrderById(orderId, userId) {
        const order = await Order.findOne({
            where: { id: orderId, userId },
            include: [{
                model: OrderItem,
                as: 'orderItems',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'imageUrl']
                }]
            }, {
                model: Payment,
                as: 'payment',
                attributes: ['id', 'amount', 'paymentMethod', 'transactionId', 'status']
            }]
        });

        if (!order) {
            throw new AppError('Order not found or not authorized to view', 404);
        }
        return order;
    }

    /**
     * Gets all orders for a specific user.
     * @param {string} userId - ID of the user.
     * @returns {Array<Object>} List of orders.
     */
    static async getUserOrders(userId) {
        const orders = await Order.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            include: [{
                model: OrderItem,
                as: 'orderItems',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'imageUrl']
                }]
            }],
        });
        return orders;
    }

    /**
     * Updates the status of an order (Admin only).
     * @param {string} orderId - ID of the order.
     * @param {string} status - New status for the order.
     * @returns {Object} Updated order.
     */
    static async updateOrderStatus(orderId, status) {
        const order = await Order.findByPk(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // Validate status transition logic if needed (e.g., cannot go from delivered to pending)
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new AppError('Invalid order status provided', 400);
        }

        order.status = status;
        await order.save();
        logger.info(`Order ${orderId} status updated to ${status}`);
        return order;
    }

    /**
     * Processes payment for an order. (Simulated)
     * In a real application, this would integrate with a payment gateway (Stripe, PayPal).
     * @param {string} orderId - ID of the order.
     * @param {Object} paymentDetails - Details from the payment gateway.
     * @returns {Object} The updated order with payment info.
     */
    static async processPayment(orderId, paymentDetails) {
        const t = await sequelize.transaction();
        try {
            const order = await Order.findByPk(orderId);
            if (!order) {
                throw new AppError('Order not found', 404);
            }
            if (order.paymentStatus === 'paid') {
                throw new AppError('Order has already been paid', 400);
            }

            // Simulate payment gateway interaction
            // Assume paymentDetails contains transactionId, method, and success status
            const isPaymentSuccessful = paymentDetails.success; // e.g., from Stripe webhook

            if (!isPaymentSuccessful) {
                await Payment.create({
                    orderId: order.id,
                    amount: order.totalAmount,
                    paymentMethod: paymentDetails.paymentMethod,
                    transactionId: paymentDetails.transactionId || `FAILED_TXN_${Date.now()}`,
                    status: 'failed'
                }, { transaction: t });
                order.paymentStatus = 'failed';
                await order.save({ transaction: t });
                await t.commit();
                logger.warn(`Payment failed for order ${orderId}. Transaction ID: ${paymentDetails.transactionId}`);
                throw new AppError('Payment failed. Please try again.', 400);
            }

            // Create payment record
            const payment = await Payment.create({
                orderId: order.id,
                amount: order.totalAmount,
                paymentMethod: paymentDetails.paymentMethod,
                transactionId: paymentDetails.transactionId,
                status: 'completed'
            }, { transaction: t });

            // Update order payment status
            order.paymentStatus = 'paid';
            order.status = 'processing'; // Move from pending to processing after payment
            await order.save({ transaction: t });

            await t.commit();
            logger.info(`Payment completed for order ${orderId}. Transaction ID: ${paymentDetails.transactionId}`);
            return { order, payment };

        } catch (error) {
            await t.rollback();
            logger.error(`Error processing payment for order ${orderId}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = OrderService;
```