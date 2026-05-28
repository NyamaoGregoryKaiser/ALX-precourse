```javascript
const CartService = require('../services/cartService');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Controller for user's shopping cart management.
 */
class CartController {
    /**
     * Get the user's cart.
     * GET /api/v1/cart
     */
    static async getUserCart(req, res, next) {
        try {
            const cart = await CartService.getUserCart(req.user.id);
            res.status(200).json({
                status: 'success',
                data: { cart }
            });
        } catch (error) {
            logger.error(`Error getting cart for user ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Add an item to the user's cart.
     * POST /api/v1/cart
     */
    static async addItemToCart(req, res, next) {
        try {
            const { productId, quantity } = req.body;
            if (!productId || !quantity || quantity <= 0) {
                return next(new AppError('Invalid productId or quantity.', 400));
            }

            const updatedCart = await CartService.addItemToCart(req.user.id, productId, quantity);
            res.status(200).json({
                status: 'success',
                message: 'Item added to cart successfully.',
                data: { cart: updatedCart }
            });
        } catch (error) {
            logger.error(`Error adding item to cart for user ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Update an item's quantity in the user's cart.
     * PATCH /api/v1/cart/:productId
     */
    static async updateCartItemQuantity(req, res, next) {
        try {
            const { productId } = req.params;
            const { quantity } = req.body;
            if (!quantity || quantity < 0) {
                return next(new AppError('Quantity must be a non-negative number.', 400));
            }

            const updatedCart = await CartService.updateCartItemQuantity(req.user.id, productId, quantity);
            res.status(200).json({
                status: 'success',
                message: 'Cart item quantity updated successfully.',
                data: { cart: updatedCart }
            });
        } catch (error) {
            logger.error(`Error updating cart item quantity for user ${req.user.id}, product ${req.params.productId}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Remove an item from the user's cart.
     * DELETE /api/v1/cart/:productId
     */
    static async removeCartItem(req, res, next) {
        try {
            const { productId } = req.params;
            const updatedCart = await CartService.removeCartItem(req.user.id, productId);
            res.status(200).json({
                status: 'success',
                message: 'Item removed from cart successfully.',
                data: { cart: updatedCart }
            });
        } catch (error) {
            logger.error(`Error removing item from cart for user ${req.user.id}, product ${req.params.productId}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Clear the entire user's cart.
     * DELETE /api/v1/cart
     */
    static async clearCart(req, res, next) {
        try {
            const clearedCart = await CartService.clearCart(req.user.id);
            res.status(200).json({
                status: 'success',
                message: 'Cart cleared successfully.',
                data: { cart: clearedCart }
            });
        } catch (error) {
            logger.error(`Error clearing cart for user ${req.user.id}: ${error.message}`);
            next(error);
        }
    }
}

module.exports = CartController;
```