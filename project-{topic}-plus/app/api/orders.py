```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, current_user
from marshmallow import ValidationError
from app.services.order_service import OrderService
from app.schemas import OrderSchema, OrderUpdateSchema
from app.utils.decorators import customer_required, admin_required
from app.models import OrderStatus
import uuid

orders_bp = Blueprint('orders', __name__)
order_schema = OrderSchema()
orders_schema = OrderSchema(many=True)
order_update_schema = OrderUpdateSchema()

@orders_bp.route('/', methods=['POST'])
@jwt_required()
@customer_required
def create_order():
    """
    Create a new order from the authenticated user's cart.
    ---
    post:
      summary: Create order from cart
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                shipping_address: { type: string, description: Address for shipping }
      security:
        - BearerAuth: []
      responses:
        201:
          description: Order created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        400:
          description: Invalid input, empty cart, or insufficient product stock
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not a customer)
    """
    shipping_address = request.json.get('shipping_address')
    if not shipping_address:
        return jsonify({"message": "Shipping address is required"}), 400

    try:
        new_order = OrderService.create_order_from_cart(current_user.id, shipping_address)
        return jsonify(new_order), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error creating order for user {current_user.id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@orders_bp.route('/my-orders', methods=['GET'])
@jwt_required()
@customer_required
def get_my_orders():
    """
    Get all orders for the authenticated user.
    ---
    get:
      summary: Get authenticated user's orders
      security:
        - BearerAuth: []
      responses:
        200:
          description: List of user's orders
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not a customer)
    """
    orders = OrderService.get_user_orders(current_user.id)
    return jsonify(orders), 200

@orders_bp.route('/<uuid:order_id>', methods=['GET'])
@jwt_required()
def get_order_details(order_id):
    """
    Get details of a specific order. Accessible by the order owner or an admin.
    ---
    get:
      summary: Get order details by ID
      parameters:
        - in: path
          name: order_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the order to retrieve
      security:
        - BearerAuth: []
      responses:
        200:
          description: Order details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not owner or admin)
        404:
          description: Order not found
    """
    order = OrderService.get_order_by_id(order_id)
    if not order:
        return jsonify({"message": "Order not found"}), 404

    # Authorization check: only order owner or admin can view
    if current_user.role != OrderStatus.ADMIN and order['user_id'] != str(current_user.id):
        return jsonify({"message": "Forbidden: You do not have access to this order."}), 403

    return jsonify(order), 200

@orders_bp.route('/<uuid:order_id>/cancel', methods=['POST'])
@jwt_required()
@customer_required # Customers can cancel their own orders, or admin can cancel any
def cancel_order(order_id):
    """
    Cancel a specific order (customer or admin).
    ---
    post:
      summary: Cancel an order
      parameters:
        - in: path
          name: order_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the order to cancel
      security:
        - BearerAuth: []
      responses:
        200:
          description: Order cancelled successfully
        400:
          description: Order cannot be cancelled (e.g., already shipped)
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not owner or admin)
        404:
          description: Order not found
    """
    order = OrderService.get_order_by_id(order_id)
    if not order:
        return jsonify({"message": "Order not found"}), 404

    # Authorization check: only order owner or admin can cancel
    if current_user.role != OrderStatus.ADMIN and order['user_id'] != str(current_user.id):
        return jsonify({"message": "Forbidden: You do not have permission to cancel this order."}), 403

    try:
        OrderService.cancel_order(order_id)
        return jsonify({"message": f"Order {order_id} cancelled successfully."}), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error cancelling order {order_id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

# Admin-only routes for order management
@orders_bp.route('/', methods=['GET'])
@jwt_required()
@admin_required
def get_all_orders_admin():
    """
    Get all orders (Admin only).
    ---
    get:
      summary: Get all orders (Admin)
      parameters:
        - in: query
          name: page
          schema: { type: integer, default: 1 }
          description: Page number for pagination
        - in: query
          name: per_page
          schema: { type: integer, default: 10 }
          description: Number of items per page
      security:
        - BearerAuth: []
      responses:
        200:
          description: List of all orders
          content:
            application/json:
              schema:
                type: object
                properties:
                  orders:
                    type: array
                    items:
                      $ref: '#/components/schemas/Order'
                  total_items: { type: integer }
                  total_pages: { type: integer }
                  current_page: { type: integer }
                  per_page: { type: integer }
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not an admin)
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    orders_data = OrderService.get_all_orders(page=page, per_page=per_page)
    return jsonify(orders_data), 200

@orders_bp.route('/<uuid:order_id>/status', methods=['PUT'])
@jwt_required()
@admin_required
def update_order_status_admin(order_id):
    """
    Update the status of an order (Admin only).
    ---
    put:
      summary: Update order status (Admin)
      parameters:
        - in: path
          name: order_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the order to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [pending, processing, shipped, delivered, cancelled]
                  description: New status for the order
      security:
        - BearerAuth: []
      responses:
        200:
          description: Order status updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        400:
          description: Invalid status or order not found
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not an admin)
        404:
          description: Order not found
    """
    try:
        data = order_update_schema.load(request.get_json())
        new_status = OrderStatus[data['status'].upper()] # Convert string to Enum
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400
    except KeyError:
        return jsonify({"message": "Invalid order status provided."}), 400

    try:
        updated_order = OrderService.update_order_status(order_id, new_status)
        if not updated_order:
            return jsonify({"message": "Order not found"}), 404
        return jsonify(updated_order), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error updating order {order_id} status: {e}")
        return jsonify({"message": "Internal server error"}), 500
```