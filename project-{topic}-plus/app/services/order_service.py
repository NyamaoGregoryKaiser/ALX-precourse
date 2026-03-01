```python
from app import db
from app.models import Order, OrderItem, Cart, CartItem, Product, OrderStatus
from app.schemas import OrderSchema, OrderUpdateSchema
from flask import current_app
from decimal import Decimal

class OrderService:
    order_schema = OrderSchema()
    orders_schema = OrderSchema(many=True)
    order_update_schema = OrderUpdateSchema()

    @classmethod
    def create_order_from_cart(cls, user_id, shipping_address):
        """
        Creates an order for a user by moving items from their cart.
        Atomically transfers cart items to order items and updates product stock.
        """
        try:
            cart = Cart.query.filter_by(user_id=user_id).first()
            if not cart or not cart.items:
                raise ValueError("Cart is empty or not found.")

            total_amount = Decimal('0.00')
            order_items_data = []
            products_to_update = []

            for cart_item in cart.items:
                product = Product.query.get(cart_item.product_id)
                if not product:
                    raise ValueError(f"Product with ID {cart_item.product_id} not found.")
                if product.stock < cart_item.quantity:
                    raise ValueError(f"Not enough stock for product {product.name}. Available: {product.stock}, Requested: {cart_item.quantity}")

                # Record product price at the time of order
                item_price = product.price * cart_item.quantity
                total_amount += item_price

                order_items_data.append({
                    'product_id': product.id,
                    'quantity': cart_item.quantity,
                    'price': product.price
                })
                products_to_update.append({'product': product, 'quantity': cart_item.quantity})

            # Create the order
            order = Order(
                user_id=user_id,
                total_amount=total_amount,
                shipping_address=shipping_address,
                status=OrderStatus.PENDING
            )
            db.session.add(order)
            db.session.flush() # Get order.id for order items

            # Create order items and update product stock
            for item_data in order_items_data:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item_data['product_id'],
                    quantity=item_data['quantity'],
                    price=item_data['price']
                )
                db.session.add(order_item)

            for product_update in products_to_update:
                product_update['product'].stock -= product_update['quantity']
                db.session.add(product_update['product']) # Mark as changed

            # Clear the user's cart
            for cart_item in cart.items:
                db.session.delete(cart_item)

            db.session.commit()
            return cls.order_schema.dump(order)

        except ValueError as e:
            db.session.rollback()
            raise e
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating order for user {user_id}: {e}")
            raise ValueError("An unexpected error occurred during order creation.")

    @classmethod
    def get_user_orders(cls, user_id):
        """Retrieves all orders for a specific user."""
        orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
        return cls.orders_schema.dump(orders)

    @classmethod
    def get_order_by_id(cls, order_id):
        """Retrieves a single order by its ID."""
        order = Order.query.get(order_id)
        if not order:
            return None
        return cls.order_schema.dump(order)

    @classmethod
    def get_all_orders(cls, page=1, per_page=10):
        """Retrieves all orders with pagination (Admin only)."""
        paginated_orders = Order.query.order_by(Order.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        orders_data = cls.orders_schema.dump(paginated_orders.items)
        return {
            "orders": orders_data,
            "total_items": paginated_orders.total,
            "total_pages": paginated_orders.pages,
            "current_page": paginated_orders.page,
            "per_page": paginated_orders.per_page
        }

    @classmethod
    def update_order_status(cls, order_id, new_status):
        """Updates the status of an order."""
        order = Order.query.get(order_id)
        if not order:
            return None

        # Add logic for status transitions if needed (e.g., cannot go from delivered to pending)
        if not isinstance(new_status, OrderStatus):
            raise ValueError(f"Invalid order status: {new_status}")

        order.status = new_status
        db.session.commit()
        return cls.order_schema.dump(order)

    @classmethod
    def cancel_order(cls, order_id):
        """
        Cancels an order and returns items to stock.
        Only allowed for orders in PENDING or PROCESSING status.
        """
        order = Order.query.get(order_id)
        if not order:
            return False

        if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
            raise ValueError(f"Order {order.id} cannot be cancelled as its status is {order.status.value}.")

        try:
            order.status = OrderStatus.CANCELLED
            for item in order.items:
                product = Product.query.get(item.product_id)
                if product:
                    product.stock += item.quantity
                    db.session.add(product)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error cancelling order {order_id}: {e}")
            raise
```