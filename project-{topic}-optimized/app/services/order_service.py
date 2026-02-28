from app.database import db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.utils.errors import NotFoundError, BadRequestError, ConflictError, InternalServerError, ForbiddenError
from flask import current_app
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, subqueryload
import datetime

class OrderService:
    """
    Handles business logic related to order management.
    """

    @staticmethod
    def get_order_by_id(order_id, user_id=None, is_admin=False):
        """
        Fetches an order by its ID.
        Includes authorization check for non-admin users.
        Eager loads order items and their products.
        """
        query = Order.query.options(
            joinedload(Order.items).joinedload(OrderItem.product)
        )
        order = query.get(order_id)

        if not order:
            raise NotFoundError(f"Order with ID {order_id} not found.")

        # Authorization: A user can only view their own orders unless they are an admin
        if not is_admin and order.user_id != user_id:
            raise ForbiddenError("You are not authorized to view this order.")

        return order

    @staticmethod
    def get_all_orders(page=1, per_page=10, user_id=None, is_admin=False, status=None, search=None):
        """
        Fetches all orders with pagination and optional filters.
        Includes authorization for non-admin users to see only their orders.
        Eager loads order items and their products.
        """
        query = Order.query.options(
            joinedload(Order.items).joinedload(OrderItem.product)
        ).order_by(Order.order_date.desc())

        if not is_admin:
            if not user_id:
                raise ForbiddenError("Authentication required to view orders.")
            query = query.filter_by(user_id=user_id)

        if status:
            try:
                order_status_enum = OrderStatus[status.upper()]
                query = query.filter_by(status=order_status_enum)
            except KeyError:
                raise BadRequestError(f"Invalid order status: {status}. Must be one of {', '.join([s.value for s in OrderStatus])}.")

        if search:
            # Example search: by shipping address
            query = query.filter(Order.shipping_address.ilike(f'%{search}%'))
            # Could also extend to search product names in order items, but that's more complex with current joinedload

        orders_pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return orders_pagination.items, orders_pagination.total

    @staticmethod
    def create_order(user_id, shipping_address, items_data, billing_address=None):
        """
        Creates a new order.
        Validates products, updates stock, and calculates total amount.
        Performs transactions to ensure data consistency.
        """
        user = User.query.get(user_id)
        if not user or not user.is_active:
            raise BadRequestError("Invalid user or user account is inactive.")

        if not items_data:
            raise BadRequestError("Order must contain at least one item.")

        new_order = Order(
            user_id=user_id,
            shipping_address=shipping_address,
            billing_address=billing_address if billing_address else shipping_address,
            order_date=datetime.datetime.utcnow(),
            status=OrderStatus.PENDING,
            total_amount=0.00
        )
        db.session.add(new_order)
        db.session.flush() # Assign an ID to new_order before adding items

        total_amount = 0.00
        order_items = []
        for item_data in items_data:
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity')

            if not product_id or not quantity or quantity <= 0:
                raise BadRequestError("Each order item must have a valid product_id and quantity > 0.")

            product = Product.query.get(product_id)
            if not product or not product.is_active:
                raise NotFoundError(f"Product with ID {product_id} not found or is inactive.")
            if product.stock_quantity < quantity:
                raise BadRequestError(f"Insufficient stock for product '{product.name}'. Available: {product.stock_quantity}, Requested: {quantity}.")

            # Update product stock
            product.stock_quantity -= quantity
            db.session.add(product) # Mark product as modified

            price_at_purchase = product.price # Capture current price

            order_item = OrderItem(
                order_id=new_order.id,
                product_id=product_id,
                quantity=quantity,
                price_at_purchase=price_at_purchase
            )
            order_items.append(order_item)
            total_amount += (price_at_purchase * quantity)

        new_order.items = order_items
        new_order.total_amount = total_amount

        try:
            db.session.add_all(order_items)
            db.session.commit()
            current_app.logger.info(f"New order {new_order.id} created for user {user_id}.")
            return new_order
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("An unexpected database conflict occurred while creating the order.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error creating order for user {user_id}: {e}")
            raise InternalServerError("Could not create order.")

    @staticmethod
    def update_order_status(order_id, new_status, is_admin=False):
        """
        Updates the status of an order. Only accessible by admins.
        """
        if not is_admin:
            raise ForbiddenError("You are not authorized to update order status.")

        order = OrderService.get_order_by_id(order_id, is_admin=True) # Admin bypasses user_id check

        try:
            order_status_enum = OrderStatus[new_status.upper()]
        except KeyError:
            raise BadRequestError(f"Invalid order status: {new_status}. Must be one of {', '.join([s.value for s in OrderStatus])}.")

        if order.status == order_status_enum:
            return order # No change needed

        # Implement logic for status transitions if necessary (e.g., cannot go from CANCELLED to SHIPPED)
        # For simplicity, we allow any valid status change for admin.

        order.status = order_status_enum
        order.updated_at = datetime.datetime.utcnow()
        try:
            db.session.commit()
            current_app.logger.info(f"Order {order_id} status updated to {new_status}.")
            return order
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating order {order_id} status: {e}")
            raise InternalServerError("Could not update order status.")

    @staticmethod
    def delete_order(order_id, is_admin=False):
        """
        Deletes an order. Only accessible by admins.
        Note: Deleting an order might require careful consideration of stock reversal
        or order archiving in a real-world scenario. This performs a hard delete.
        """
        if not is_admin:
            raise ForbiddenError("You are not authorized to delete orders.")

        order = OrderService.get_order_by_id(order_id, is_admin=True)

        # In a real system, you might want to return stock for cancelled/deleted orders
        # or have a soft delete. For this example, we proceed with direct deletion.
        try:
            db.session.delete(order)
            db.session.commit()
            current_app.logger.info(f"Order {order_id} deleted by admin.")
            return {"message": "Order deleted successfully."}
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting order {order_id}: {e}")
            raise InternalServerError("Could not delete order.")