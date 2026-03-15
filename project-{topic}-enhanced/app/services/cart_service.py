from app import db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.utils.errors import NotFoundError, BadRequestError, ConflictError
import logging

logger = logging.getLogger(__name__)

class CartService:
    @staticmethod
    def get_or_create_cart(user_id):
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.session.add(cart)
            db.session.commit()
            logger.info(f"Created new cart for user {user_id}")
        return cart

    @staticmethod
    def get_cart_items(user_id):
        cart = CartService.get_or_create_cart(user_id)
        return cart.items

    @staticmethod
    def add_to_cart(user_id, product_id, quantity=1):
        if quantity <= 0:
            raise BadRequestError("Quantity must be positive.")

        cart = CartService.get_or_create_cart(user_id)
        product = Product.query.get(product_id)

        if not product or not product.is_active:
            raise NotFoundError(f"Product with id {product_id} not found or is inactive.")
        if product.stock_quantity < quantity:
            raise BadRequestError(f"Not enough stock for product '{product.name}'. Available: {product.stock_quantity}")

        cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()

        try:
            if cart_item:
                # Check for total quantity vs stock
                if product.stock_quantity < (cart_item.quantity + quantity):
                    raise BadRequestError(f"Adding {quantity} to cart would exceed stock. Current in cart: {cart_item.quantity}, Available: {product.stock_quantity}")
                cart_item.quantity += quantity
                logger.info(f"Updated quantity for product {product_id} in cart {cart.id}. New quantity: {cart_item.quantity}")
            else:
                cart_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity, price_at_addition=product.price)
                db.session.add(cart_item)
                logger.info(f"Added product {product_id} to cart {cart.id} with quantity {quantity}")
            
            db.session.commit()
            return cart_item
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error adding product {product_id} to cart {cart.id}: {e}")
            raise BadRequestError(f"Failed to add to cart: {e}")

    @staticmethod
    def update_cart_item_quantity(user_id, product_id, quantity):
        if quantity <= 0:
            return CartService.remove_from_cart(user_id, product_id) # Remove if quantity is 0 or less

        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            raise NotFoundError(f"Cart not found for user {user_id}.")

        cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()
        if not cart_item:
            raise NotFoundError(f"Product {product_id} not found in cart.")

        product = Product.query.get(product_id)
        if not product: # Should not happen if product was added, but defensive check
            raise NotFoundError(f"Product with id {product_id} not found.")

        if product.stock_quantity < quantity:
            raise BadRequestError(f"Not enough stock for product '{product.name}'. Available: {product.stock_quantity}, requested: {quantity}")

        try:
            cart_item.quantity = quantity
            db.session.commit()
            logger.info(f"Updated product {product_id} quantity to {quantity} in cart {cart.id}.")
            return cart_item
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating product {product_id} quantity in cart {cart.id}: {e}")
            raise BadRequestError(f"Failed to update cart item quantity: {e}")

    @staticmethod
    def remove_from_cart(user_id, product_id):
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            raise NotFoundError(f"Cart not found for user {user_id}.")

        cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()
        if not cart_item:
            raise NotFoundError(f"Product {product_id} not found in cart.")

        try:
            db.session.delete(cart_item)
            db.session.commit()
            logger.info(f"Removed product {product_id} from cart {cart.id}.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error removing product {product_id} from cart {cart.id}: {e}")
            raise BadRequestError(f"Failed to remove from cart: {e}")

    @staticmethod
    def clear_cart(user_id):
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            raise NotFoundError(f"Cart not found for user {user_id}.")
        
        try:
            # Delete all cart items associated with the cart
            CartItem.query.filter_by(cart_id=cart.id).delete()
            db.session.commit()
            logger.info(f"Cleared cart for user {user_id}.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error clearing cart for user {user_id}: {e}")
            raise BadRequestError(f"Failed to clear cart: {e}")