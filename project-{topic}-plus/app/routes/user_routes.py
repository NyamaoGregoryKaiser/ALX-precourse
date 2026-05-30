```python
from flask import Blueprint, request, jsonify, current_app, g
from app.utils.errors import BadRequestError, NotFoundError, ConflictError, ForbiddenError, UnauthorizedError
from app.services.user_service import UserService
from app.schemas.user import user_schema, users_schema, user_register_schema, user_update_schema
from app.models.user import UserRole
from app.utils.decorators import jwt_required_wrapper, roles_required
from http import HTTPStatus
from app.extensions import limiter

user_bp = Blueprint('user_bp', __name__)
user_service = UserService()

@user_bp.route('', methods=['GET'])
@jwt_required_wrapper
@roles_required(UserRole.ADMIN) # Only admins can view all users
@limiter.limit("30 per minute")
def get_users():
    """
    Retrieves all users. Requires ADMIN role.
    """
    current_app.logger.info(f"Admin user {g.current_user.id} requesting all users.")
    users = user_service.get_all_users()
    return jsonify(users), HTTPStatus.OK

@user_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required_wrapper
@limiter.limit("60 per minute")
def get_user(user_id):
    """
    Retrieves a single user by ID.
    Requires ADMIN role OR the user is requesting their own profile.
    """
    current_app.logger.info(f"User {g.current_user.id} requesting user profile for ID: {user_id}.")
    
    # Authorization: Admins can view any user, regular users can only view their own profile
    if not g.current_user.is_admin() and g.current_user.id != user_id:
        raise ForbiddenError("You do not have permission to view this user's profile.")

    user = user_service.get_user_by_id(user_id)
    return jsonify(user), HTTPStatus.OK

@user_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required_wrapper
@limiter.limit("20 per minute")
def update_user(user_id):
    """
    Updates a user's information.
    Requires ADMIN role OR the user is updating their own profile.
    Regular users cannot change their role.
    """
    current_app.logger.info(f"User {g.current_user.id} attempting to update user profile for ID: {user_id}.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    # Authorization: Admins can update any user, regular users can only update their own profile
    if not g.current_user.is_admin() and g.current_user.id != user_id:
        raise ForbiddenError("You do not have permission to update this user's profile.")

    # Prevent non-admin users from changing roles or 'is_active' status
    if not g.current_user.is_admin():
        if 'role' in data:
            current_app.logger.warning(f"User {g.current_user.id} attempted to change role for user {user_id}. Denied.")
            raise ForbiddenError("You do not have permission to change user roles.")
        if 'is_active' in data:
            current_app.logger.warning(f"User {g.current_user.id} attempted to change active status for user {user_id}. Denied.")
            raise ForbiddenError("You do not have permission to change user active status.")
    
    try:
        updated_user = user_service.update_user(user_id, data)
        return jsonify(updated_user), HTTPStatus.OK
    except (BadRequestError, NotFoundError, ConflictError, ForbiddenError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to update user ID {user_id}: {e}", exc_info=True)
        raise

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required_wrapper
@roles_required(UserRole.ADMIN) # Only admins can delete users
@limiter.limit("5 per minute")
def delete_user(user_id):
    """
    Deletes a user by ID. Requires ADMIN role.
    Admins cannot delete themselves.
    """
    current_app.logger.info(f"Admin user {g.current_user.id} attempting to delete user ID: {user_id}.")
    
    if g.current_user.id == user_id:
        raise BadRequestError("You cannot delete your own admin account.")

    try:
        result = user_service.delete_user(user_id)
        return jsonify(result), HTTPStatus.OK
    except (NotFoundError, BadRequestError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to delete user ID {user_id}: {e}", exc_info=True)
        raise

# Admin-specific endpoint to create users with specific roles
@user_bp.route('/create_with_role', methods=['POST'])
@jwt_required_wrapper
@roles_required(UserRole.ADMIN) # Only ADMIN can use this endpoint
@limiter.limit("10 per minute")
def create_user_with_role():
    """
    Admin-only endpoint to create a user and assign a specific role.
    Requires ADMIN role.
    """
    current_app.logger.info(f"Admin user {g.current_user.id} attempting to create user with specific role.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    # Validate input with schema, allowing role field
    errors = user_register_schema.validate(data)
    if errors:
        raise BadRequestError(f"Validation errors: {errors}")

    # Ensure the role provided is valid
    if 'role' in data and data['role'] not in [e.value for e in UserRole]:
        raise BadRequestError(f"Invalid role '{data['role']}'. Must be one of {[e.value for e in UserRole]}.")
    
    # If no role is provided, default to USER (though admin could override this logic)
    if 'role' not in data:
        data['role'] = UserRole.USER.value

    try:
        user = user_service.create_user(data)
        return jsonify({"message": "User created successfully", "user": user}), HTTPStatus.CREATED
    except (BadRequestError, ConflictError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to create user with role: {e}", exc_info=True)
        raise
```