from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from webargs import fields
from webargs.flaskparser import use_args, use_kwargs
from app.schemas.order import OrderSchema, OrderItemSchema
from app.models.order import OrderStatus
from app.services.order_service import OrderService
from app.utils.errors import APIError, NotFoundError, BadRequestError, ConflictError, ForbiddenError
from app.utils.decorators import role_required
from app.extensions import limiter, smorest_api
from flask_smorest import Blueprint as SmorestBlueprint, abort

orders_bp = SmorestBlueprint('orders', __name__, description='Customer Order Management')

@orders_bp.route('/', methods=['GET'])
@limiter.limit("60 per hour")
@jwt_required()
@use_kwargs({
    'page': fields.Int(missing=1),
    'per_page': fields.Int(missing=10),
    'status': fields.Str(missing=None, validate=lambda s: s.upper() in [e.name for e in OrderStatus], description=f"Order status filter. Must be one of: {', '.join([e.value for e in OrderStatus])}"),
    'search': fields.Str(missing=None),
}, location="query")
@orders_bp.response(200, OrderSchema(many=True))
@orders_bp.doc(summary="Get all orders for authenticated user or all orders for admin",
             description="Retrieves a paginated list of orders. Customers see their own orders. Admins see all orders. Can filter by status and search by shipping address.")
def get_all_orders(page, per_page, status, search):
    """
    Retrieve a paginated list of orders.
    Customers see their own orders. Admins see all orders.
    """
    try:
        current_user_id = get_jwt_identity()
        current_user_roles = get_jwt().get('roles', [])
        is_admin = 'ADMIN' in current_user_roles

        orders, total = OrderService.get_all_orders(
            page=page, per_page=per_page,
            user_id=current_user_id,
            is_admin=is_admin,
            status=status,
            search=search
        )
        return jsonify({
            "items": OrderSchema(many=True).dump(orders),
            "total": total,
            "page": page,
            "per_page": per_page
        }), 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching orders.")


@orders_bp.route('/<int:order_id>', methods=['GET'])
@limiter.limit("60 per hour")
@jwt_required()
@orders_bp.response(200, OrderSchema)
@orders_bp.doc(summary="Get order by ID",
             description="Retrieves a specific order by its ID. Customers see their own orders. Admins see any order.")
def get_order_by_id(order_id):
    """
    Retrieve a specific order by ID.
    Customers see their own orders. Admins see any order.
    """
    try:
        current_user_id = get_jwt_identity()
        current_user_roles = get_jwt().get('roles', [])
        is_admin = 'ADMIN' in current_user_roles

        order = OrderService.get_order_by_id(order_id, user_id=current_user_id, is_admin=is_admin)
        return order, 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except NotFoundError as e:
        abort(404, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching the order.")


@orders_bp.route('/', methods=['POST'])
@limiter.limit("10 per hour")
@jwt_required()
@role_required(['CUSTOMER']) # Only customers can create orders
@orders_bp.arguments(OrderSchema(exclude=('id', 'user_id', 'order_date', 'status', 'total_amount', 'updated_at')))
@orders_bp.response(201, OrderSchema)
@orders_bp.doc(summary="Create a new order",
             description="Creates a new order for the authenticated user. Requires CUSTOMER role.")
def create_order(order_data):
    """
    Create a new order for the authenticated user.
    Requires CUSTOMER role.
    """
    try:
        current_user_id = get_jwt_identity()
        shipping_address = order_data.pop('shipping_address')
        billing_address = order_data.pop('billing_address', None)
        items_data = order_data.pop('items')

        order = OrderService.create_order(
            user_id=current_user_id,
            shipping_address=shipping_address,
            billing_address=billing_address,
            items_data=items_data
        )
        return order, 201
    except ForbiddenError as e:
        abort(403, message=str(e))
    except NotFoundError as e:
        abort(404, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except ConflictError as e:
        abort(409, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred during order creation.")


@orders_bp.route('/<int:order_id>/status', methods=['PUT'])
@limiter.limit("30 per hour")
@jwt_required()
@role_required(['ADMIN', 'EDITOR']) # Only admins/editors can update order status
@use_args({'status': fields.Str(required=True, validate=lambda s: s.upper() in [e.name for e in OrderStatus])})
@orders_bp.response(200, OrderSchema)
@orders_bp.doc(summary="Update order status by ID",
             description=f"Updates the status of an order. Requires ADMIN or EDITOR role. Valid statuses: {', '.join([e.value for e in OrderStatus])}.")
def update_order_status(args, order_id):
    """
    Update the status of an order.
    Requires ADMIN or EDITOR role.
    """
    try:
        current_user_roles = get_jwt().get('roles', [])
        is_admin = 'ADMIN' in current_user_roles

        order = OrderService.update_order_status(order_id, args['status'], is_admin=is_admin)
        return order, 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except NotFoundError as e:
        abort(404, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while updating order status.")


@orders_bp.route('/<int:order_id>', methods=['DELETE'])
@limiter.limit("10 per hour")
@jwt_required()
@role_required(['ADMIN']) # Only admins can delete orders
@orders_bp.response(200, description="Order deleted successfully")
@orders_bp.doc(summary="Delete order by ID",
             description="Deletes an order. Requires ADMIN role.")
def delete_order(order_id):
    """
    Delete an order.
    Requires ADMIN role.
    """
    try:
        current_user_roles = get_jwt().get('roles', [])
        is_admin = 'ADMIN' in current_user_roles

        response = OrderService.delete_order(order_id, is_admin=is_admin)
        return jsonify(response), 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except NotFoundError as e:
        abort(404, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while deleting the order.")