```javascript
const { Cart, CartItem, Product } = require('../config/db');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');
const { setCache, getCache, deleteCache } = require('../utils/cache');

// Helper to invalidate user's cart cache
const invalidateCartCache = (userId) => {
    deleteCache(`cart_${userId}`);
    logger.debug(`Invalidated cache for cart of user: ${userId}`);
};

/**
 * Service for Cart related business logic.
 */
class CartService {
    /**
     * Get a user's cart, creating one if it doesn't exist.
     * @param {string} userId - The ID of the user.
     * @returns {Object} The user's cart with items.
     */
    static async getUserCart(userId) {
        const cacheKey = `cart_${userId}`;
        const cachedCart = getCache(cacheKey);
        if (cachedCart) {
            logger.debug(`Serving cart from cache for user: ${userId}`);
            return cachedCart;
        }

        let cart = await Cart.findOne({
            where: { userId },
            include: [{
                model: CartItem,
                as: 'cartItems',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'imageUrl', 'stock']
                }]
            }]
        });

        if (!cart) {
            cart = await Cart.create({ userId });
            logger.info(`New cart created for user: ${userId}`);
        }

        // Calculate total amount for the cart
        const cartWithTotal = this._calculateCartTotal(cart);
        setCache(cacheKey, cartWithTotal);
        logger.debug(`Cart fetched from DB and cached for user: ${userId}`);
        return cartWithTotal;
    }

    /**
     * Adds an item to the user's cart.
     * @param {string} userId - The ID of the user.
     * @param {string} productId - The ID of the product to add.
     * @param {number} quantity - The quantity to add.
     * @returns {Object} The updated cart.
     */
    static async addItemToCart(userId, productId, quantity) {
        const cart = await this.getUserCart(userId);
        const product = await Product.findByPk(productId);

        if (!product) {
            throw new AppError('Product not found', 404);
        }
        if (product.stock < quantity) {
            throw new AppError(`Not enough stock for ${product.name}. Available: ${product.stock}`, 400);
        }

        let cartItem = await CartItem.findOne({
            where: { cartId: cart.id, productId: product.id }
        });

        if (cartItem) {
            const newQuantity = cartItem.quantity + quantity;
            if (product.stock < newQuantity) {
                throw new AppError(`Adding ${quantity} would exceed available stock for ${product.name}. Max quantity allowed: ${product.stock}`, 400);
            }
            cartItem.quantity = newQuantity;
            await cartItem.save();
            logger.info(`Updated quantity for product ${productId} in cart ${cart.id} to ${cartItem.quantity}`);
        } else {
            cartItem = await CartItem.create({
                cartId: cart.id,
                productId: product.id,
                quantity: quantity,
                priceAtAddition: product.price // Store price at addition
            });
            logger.info(`Added product ${productId} to cart ${cart.id} with quantity ${quantity}`);
        }

        invalidateCartCache(userId);
        return this.getUserCart(userId); // Return updated cart
    }

    /**
     * Updates the quantity of an item in the user's cart.
     * @param {string} userId - The ID of the user.
     * @param {string} productId - The ID of the product to update.
     * @param {number} quantity - The new quantity.
     * @returns {Object} The updated cart.
     */
    static async updateCartItemQuantity(userId, productId, quantity) {
        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            throw new AppError('Cart not found for user', 404);
        }

        const product = await Product.findByPk(productId);
        if (!product) {
            throw new AppError('Product not found', 404);
        }
        if (product.stock < quantity) {
            throw new AppError(`Not enough stock for ${product.name}. Available: ${product.stock}`, 400);
        }
        if (quantity <= 0) {
            // If quantity is 0 or less, remove the item
            return this.removeCartItem(userId, productId);
        }

        const [updatedRows] = await CartItem.update(
            { quantity: quantity },
            { where: { cartId: cart.id, productId: productId } }
        );

        if (updatedRows === 0) {
            throw new AppError('Cart item not found or quantity not changed', 404);
        }

        invalidateCartCache(userId);
        logger.info(`Updated product ${productId} quantity to ${quantity} in cart ${cart.id}`);
        return this.getUserCart(userId);
    }

    /**
     * Removes an item from the user's cart.
     * @param {string} userId - The ID of the user.
     * @param {string} productId - The ID of the product to remove.
     * @returns {Object} The updated cart.
     */
    static async removeCartItem(userId, productId) {
        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            throw new AppError('Cart not found for user', 404);
        }

        const deletedCount = await CartItem.destroy({
            where: { cartId: cart.id, productId: productId }
        });

        if (deletedCount === 0) {
            throw new AppError('Cart item not found', 404);
        }

        invalidateCartCache(userId);
        logger.info(`Removed product ${productId} from cart ${cart.id}`);
        return this.getUserCart(userId);
    }

    /**
     * Clears all items from the user's cart.
     * @param {string} userId - The ID of the user.
     * @returns {Object} An empty cart.
     */
    static async clearCart(userId) {
        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            throw new AppError('Cart not found for user', 404);
        }

        await CartItem.destroy({ where: { cartId: cart.id } });

        invalidateCartCache(userId);
        logger.info(`Cleared all items from cart ${cart.id}`);
        return this.getUserCart(userId); // Returns an empty cart
    }

    /**
     * Helper to calculate the total amount of a cart.
     * @param {Object} cart - The cart object with cartItems eager loaded.
     * @returns {Object} The cart object with a `totalAmount` property.
     */
    static _calculateCartTotal(cart) {
        if (!cart || !cart.cartItems) {
            cart.totalAmount = 0;
            return cart;
        }

        // Use reduce for robust calculation
        const totalAmount = cart.cartItems.reduce((acc, item) => {
            // Ensure price is a number, handling Decimal type from Sequelize
            const itemPrice = parseFloat(item.priceAtAddition || item.product.price);
            return acc + (itemPrice * item.quantity);
        }, 0);

        // Format to 2 decimal places
        cart.dataValues.totalAmount = parseFloat(totalAmount.toFixed(2));
        return cart;
    }
}

module.exports = CartService;
```