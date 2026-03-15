from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.order_service import OrderService
from app.utils.decorators import customer_required, admin_required
from app.utils.errors import NotFoundError, BadRequestError, ForbiddenError
import logging

orders_bp = Blueprint('orders_bp', __name__)
api = Api(orders_bp)
logger = logging.getLogger(__name__)

class OrderListResource(Resource):
    @customer_required()
    def get(self):
        """
        Get All Orders for the Authenticated User (Customer/Admin Only)
        ---
        security:
          - Bearer: []
        responses:
          200:
            description: List of orders for the user
            schema:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  user_id: {type: integer}
                  order_date: {type: string, format: date-time}
                  total_amount: {type: number}
                  status: {type: string}
                  payment_status: {type: string}
                  shipping_address: {type: string}
        """
        user_id = get_jwt_identity()['id']
        try:
            orders = OrderService.get_all_orders_for_user(user_id)
            return [{
                'id': o.id,
                'user_id': o.user_id,
                'order_date': o.order_date.isoformat(),
                'total_amount': float(o.total_amount),
                'status': o.status,
                'payment_status': o.payment_status,
                'shipping_address': o.shipping_address
            } for o in orders], 200
        except Exception as e:
            logger.error(f"Error getting orders for user {user_id}: {e}")
            raise BadRequestError(f"Failed to retrieve orders: {e}")

    @customer_required()
    def post(self):
        """
        Place an Order from Cart (Customer/Admin Only)
        ---
        parameters:
          - in: body
            name: body
            schema:
              type: object
              required:
                - shipping_address
              properties:
                shipping_address:
                  type: string
                  description: Full shipping address for the order
        security:
          - Bearer: []
        responses:
          201:
            description: Order placed successfully
            schema:
              type: object
              properties:
                message: {type: string}
                order_id: {type: integer}
                total_amount: {type: number}
                status: {type: string}
          400:
            description: Bad request (e.g., empty cart, out of stock, invalid address)
          401:
            description: Unauthorized
          403:
            description: Forbidden (not a customer/admin)
        """
        user_id = get_jwt_identity()['id']
        data = request.get_json()
        shipping_address = data.get('shipping_address')

        if not shipping_address or not isinstance(shipping_address, str) or len(shipping_address.strip()) == 0:
            raise BadRequestError("Shipping address is required.")

        try:
            order = OrderService.place_order_from_cart(user_id, shipping_address)
            return {
                'message': 'Order placed successfully',
                'order_id': order.id,
                'total_amount': float(order.total_amount),
                'status': order.status
            }, 201
        except BadRequestError as e:
            raise e
        except Exception as e:
            logger.error(f"Error placing order for user {user_id}: {e}")
            raise BadRequestError(f"Failed to place order: {e}")

class OrderResource(Resource):
    @customer_required()
    def get(self, order_id):
        """
        Get Order Details by ID (Customer/Admin Only)
        ---
        parameters:
          - in: path
            name: order_id
            type: integer
            required: true
            description: ID of the order to retrieve
        security:
          - Bearer: []
        responses:
          200:
            description: Order details
            schema:
              type: object
              properties:
                id: {type: integer}
                user_id: {type: integer}
                order_date: {type: string, format: date-time}
                total_amount: {type: number}
                status: {type: string}
                payment_status: {type: string}
                shipping_address: {type: string}
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      product_id: {type: integer}
                      product_name: {type: string}
                      quantity: {type: integer}
                      price_at_purchase: {type: number}
                      total_item_price: {type: number}
          401:
            description: Unauthorized
          403:
            description: Forbidden (not owner or admin)
          404:
            description: Order not found
        """
        current_user_identity = get_jwt_identity()
        current_user_id = current_user_identity['id']
        current_user_role = current_user_identity['role']

        try:
            order = OrderService.get_order_by_id(order_id)
            if order.user_id != current_user_id and current_user_role != 'admin':
                raise ForbiddenError("You do not have permission to view this order.")
            
            order_items_data = []
            for item in order.items:
                order_items_data.append({
                    'product_id': item.product_id,
                    'product_name': item.product.name if item.product else 'Unknown Product',
                    'quantity': item.quantity,
                    'price_at_purchase': float(item.price_at_purchase),
                    'total_item_price': float(item.quantity * item.price_at_purchase)
                })

            return {
                'id': order.id,
                'user_id': order.user_id,
                'order_date': order.order_date.isoformat(),
                'total_amount': float(order.total_amount),
                'status': order.status,
                'payment_status': order.payment_status,
                'shipping_address': order.shipping_address,
                'items': order_items_data
            }, 200
        except (NotFoundError, ForbiddenError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting order {order_id} for user {current_user_id}: {e}")
            raise BadRequestError(f"Failed to retrieve order: {e}")

    @admin_required()
    def put(self, order_id):
        """
        Update Order Status (Admin Only)
        ---
        parameters:
          - in: path
            name: order_id
            type: integer
            required: true
            description: ID of the order to update
          - in: body
            name: body
            schema:
              type: object
              required:
                - status
              properties:
                status:
                  type: string
                  enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
                  description: New status of the order
                payment_status:
                  type: string
                  enum: ['pending', 'paid', 'refunded']
                  description: New payment status of the order (optional)
        security:
          - Bearer: []
        responses:
          200:
            description: Order status updated successfully
          400:
            description: Bad request (invalid status)
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          404:
            description: Order not found
        """
        data = request.get_json()
        new_status = data.get('status')
        new_payment_status = data.get('payment_status')

        if not new_status:
            raise BadRequestError("New status is required.")

        try:
            order = OrderService.update_order_status(order_id, new_status, new_payment_status)
            return {
                'message': 'Order status updated',
                'order_id': order.id,
                'status': order.status,
                'payment_status': order.payment_status
            }, 200
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating status for order {order_id}: {e}")
            raise BadRequestError(f"Failed to update order status: {e}")

api.add_resource(OrderListResource, '/')
api.add_resource(OrderResource, '/<int:order_id>')