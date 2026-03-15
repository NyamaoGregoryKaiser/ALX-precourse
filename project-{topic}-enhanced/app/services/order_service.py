from app import db
from app.models.order import Order, OrderItem
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.utils.errors import NotFoundError, BadRequestError
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)

class OrderService:
    @staticmethod
    def get_all_orders_for_user(user_id):
        return Order.query.filter_by(user_id=user_id).order_by(Order.order_date.desc()).all()

    @staticmethod
    def get_order_by_id(order_id):
        order = Order.query.get(order_id)
        if not order:
            raise NotFoundError(f"Order with id {order_id} not found.")
        return order
    
    @staticmethod
    def get_order_by_id_and_user(order_id, user_id):
        order = Order.query.filter_by(id=order_id, user_id=user_id).first()
        if not order:
            raise NotFoundError(f"Order with id {order_id} not found for user {user_id}.")
        return order

    @staticmethod
    def place_order_from_cart(user_id, shipping_address):
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart or not cart.items:
            raise BadRequestError("Cannot place an order with an empty cart.")

        total_amount = 0
        order_items_to_create = []
        products_to_update = []

        try:
            # Check stock and prepare order items in a single transaction
            for cart_item in cart.items:
                product = Product.query.get(cart_item.product_id)
                if not product or not product.is_active:
                    raise BadRequestError(f"Product '{cart_item.product.name}' is no longer available.")
                if product.stock_quantity < cart_item.quantity:
                    raise BadRequestError(f"Not enough stock for '{product.name}'. Available: {product.stock_quantity}, Requested: {cart_item.quantity}")

                total_amount += cart_item.quantity * cart_item.price_at_addition
                
                order_items_to_create.append({
                    'product_id': product.id,
                    'quantity': cart_item.quantity,
                    'price_at_purchase': cart_item.price_at_addition
                })
                
                # Prepare stock update
                product.stock_quantity -= cart_item.quantity
                products_to_update.append(product)
            
            # Create the order
            new_order = Order(
                user_id=user_id,
                total_amount=total_amount,
                shipping_address=shipping_address,
                status='pending', # Could be 'processing' if payment is immediate
                payment_status='pending' # Assume payment is handled separately or immediately after
            )
            db.session.add(new_order)
            db.session.flush() # Get order ID before committing

            # Add order items
            for item_data in order_items_to_create:
                order_item = OrderItem(
                    order_id=new_order.id,
                    product_id=item_data['product_id'],
                    quantity=item_data['quantity'],
                    price_at_purchase=item_data['price_at_purchase']
                )
                db.session.add(order_item)
            
            # Update product stock
            for product in products_to_update:
                db.session.add(product) # Re-add to session to ensure changes are tracked

            # Clear the user's cart
            CartItem.query.filter_by(cart_id=cart.id).delete()

            db.session.commit()
            logger.info(f"Order {new_order.id} placed successfully by user {user_id}.")
            return new_order
        except IntegrityError:
            db.session.rollback()
            logger.error(f"Integrity error during order placement for user {user_id}.")
            raise BadRequestError("Database integrity error. Please try again.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error placing order for user {user_id}: {e}")
            raise BadRequestError(f"Failed to place order: {e}")

    @staticmethod
    def update_order_status(order_id, new_status, new_payment_status=None):
        order = OrderService.get_order_by_id(order_id)
        
        valid_statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
        valid_payment_statuses = ['pending', 'paid', 'refunded']

        if new_status not in valid_statuses:
            raise BadRequestError(f"Invalid order status: {new_status}. Valid statuses are: {', '.join(valid_statuses)}")
        if new_payment_status and new_payment_status not in valid_payment_statuses:
            raise BadRequestError(f"Invalid payment status: {new_payment_status}. Valid statuses are: {', '.join(valid_payment_statuses)}")

        try:
            order.status = new_status
            if new_payment_status:
                order.payment_status = new_payment_status
            db.session.commit()
            logger.info(f"Order {order_id} status updated to {new_status}.")
            return order
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating status for order {order_id}: {e}")
            raise BadRequestError(f"Failed to update order status: {e}")
    
    @staticmethod
    def get_order_items(order_id):
        order = OrderService.get_order_by_id(order_id)
        return order.items