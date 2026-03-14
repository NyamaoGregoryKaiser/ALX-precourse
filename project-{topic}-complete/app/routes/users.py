```python
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.user_service import UserService
from app.utils.decorators import admin_required, log_route_access
from app.utils.exceptions import ResourceNotFound, DuplicateResource, InvalidInput, UnauthorizedAccess

users_bp = Blueprint('users', __name__)
logger = logging.getLogger(__name__)

@users_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
@log_route_access
def create_user():
    data = request.get_json()
    try:
        user = UserService.create_user(data)
        return jsonify(user.to_dict(include_email=True, include_role=True)), 201
    except (InvalidInput, DuplicateResource) as e:
        return jsonify(message=str(e)), 400
    except Exception as e:
        logger.exception("Error creating user via API")
        return jsonify(message="An unexpected error occurred."), 500

@users_bp.route('/', methods=['GET'])
@jwt_required()
@admin_required
@log_route_access
def get_all_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    try:
        pagination = UserService.get_all_users(page, per_page)
        users = [user.to_dict(include_email=True, include_role=True) for user in pagination.items]
        return jsonify({
            'users': users,
            'total': pagination.total,
            'pages': pagination.pages,
            'page': pagination.page
        }), 200
    except Exception as e:
        logger.exception("Error fetching all users via API")
        return jsonify(message="An unexpected error occurred."), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required # Only admins can view any user's full profile
@log_route_access
def get_user_by_id(user_id):
    try:
        user = UserService.get_user_by_id(user_id)
        return jsonify(user.to_dict(include_email=True, include_role=True)), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error fetching user {user_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required # Only admins can update any user's profile
@log_route_access
def update_user(user_id):
    data = request.get_json()
    try:
        user = UserService.update_user(user_id, data)
        return jsonify(user.to_dict(include_email=True, include_role=True)), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except (InvalidInput, DuplicateResource) as e:
        return jsonify(message=str(e)), 400
    except Exception as e:
        logger.exception(f"Error updating user {user_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@log_route_access
def delete_user(user_id):
    try:
        UserService.delete_user(user_id)
        return jsonify(message="User deleted successfully"), 204
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error deleting user {user_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

```