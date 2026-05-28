```javascript
const OrderService = require('../services/orderService');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Controller for order management and checkout process.
 */
class OrderController {
    /**
     * Create a new order from the user's cart.
     * POST /api/v1/orders
     */
    static async createOrder(req, res, next) {
        try {
            const { shippingAddress } = req.body;
            if (!shippingAddress) {
                return next(new AppError('Shipping address is required to create an order.', 400));
            }

            const order = await OrderService.createOrderFromCart(req.user.id, { address: shippingAddress });
            res.status(201).json({
                status: 'success',
                message: 'Order created successfully.',
                data: { order }
            });
        } catch (error) {
            logger.error(`Error creating order for user ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Get a single order by ID for the authenticated user.
     * GET /api/v1/orders/:id
     */
    static async getOrderById(req, res, next) {
        try {
            const order = await OrderService.getOrderById(req.params.id, req.user.id);
            res.status(200).json({
                status: 'success',
                data: { order }
            });
        } catch (error) {
            logger.error(`Error getting order ${req.params.id} for user ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Get all orders for the authenticated user.
     * GET /api/v1/orders
     */
    static async getUserOrders(req, res, next) {
        try {
            const orders = await OrderService.getUserOrders(req.user.id);
            res.status(200).json({
                status: 'success',
                results: orders.length,
                data: { orders }
            });
        } catch (error) {
            logger.error(`Error getting all orders for user ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Update the status of an order (Admin only).
     * PATCH /api/v1/admin/orders/:id/status
     */
    static async updateOrderStatus(req, res, next) {
        try {
            const { status } = req.body;
            if (!status) {
                return next(new AppError('Order status is required.', 400));
            }

            const updatedOrder = await OrderService.updateOrderStatus(req.params.id, status);
            res.status(200).json({
                status: 'success',
                message: 'Order status updated successfully.',
                data: { order: updatedOrder }
            });
        } catch (error) {
            logger.error(`Error updating status for order ${req.params.id} (Admin): ${error.message}`);
            next(error);
        }
    }

    /**
     * Simulate processing payment for an order.
     * POST /api/v1/orders/:id/pay
     */
    static async processPayment(req, res, next) {
        try {
            const { paymentMethod, transactionId } = req.body;
            // In a real app, `transactionId` would come from the payment gateway
            if (!paymentMethod || !transactionId) {
                return next(new AppError('Payment method and transaction ID are required.', 400));
            }

            // Simulate success based on some condition or always success for demo
            const simulatedPaymentSuccess = true; // Replace with actual gateway response

            const { order, payment } = await OrderService.processPayment(req.params.id, {
                paymentMethod,
                transactionId,
                success: simulatedPaymentSuccess
            });

            res.status(200).json({
                status: 'success',
                message: 'Payment processed successfully.',
                data: { order, payment }
            });

        } catch (error) {
            logger.error(`Error processing payment for order ${req.params.id}: ${error.message}`);
            next(error);
        }
    }
}

module.exports = OrderController;
```