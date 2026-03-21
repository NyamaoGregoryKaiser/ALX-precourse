from flask import Blueprint, jsonify
from app.services.user_service import UserService
from app.utils.decorators import admin_required, jwt_and_roles_required, rate_limit, cache_response
from app.schemas import UserUpdateSchema, validate_json_body
from app.models import Role
import logging

users_bp = Blueprint('users', __name__)
logger = logging.getLogger(__name__)

@users_bp.route('/', methods=['GET'])
@rate_limit("30 per minute")
@admin_required
@cache_response(timeout=60, key_prefix='all_users')
def get_all_users(current_user_id, current_user_role):
    """
    Retrieve all users. (Admin access required)
    ---
    tags:
      - Users
    security:
      - BearerAuth: []
    responses:
      200:
        description: A list of all users.
        schema:
          type: array
          items:
            type: object
            properties:
              id: {type: integer}
              username: {type: string}
              email: {type: string}
              role: {type: string}
              created_at: {type: string, format: date-time}
      401:
        $ref: '#/definitions/ErrorResponse'
      403:
        $ref: '#/definitions/ErrorResponse'
    """
    users = UserService.get_all_users()
    logger.info(f"Admin {current_user_id} retrieved all {len(users)} users.")
    return jsonify([user.to_dict(include_email=True) for user in users]), 200

@users_bp.route('/<int:user_id>', methods=['GET'])
@rate_limit("30 per minute")
@jwt_and_roles_required(roles=[Role.USER, Role.ADMIN])
def get_user(user_id, current_user_id, current_user_role):
    """
    Retrieve a specific user by ID. (Admin or self access required)
    ---
    tags:
      - Users
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: ID of the user to retrieve.
    responses:
      200:
        description: Details of the specified user.
        schema:
          type: object
          properties:
            id: {type: integer}
            username: {type: string}
            email: {type: string}
            role: {type: string}
            created_at: {type: string, format: date-time}
      401:
        $ref: '#/definitions/ErrorResponse'
      403:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
    """
    # Authorization logic is within UserService.get_user_by_id if needed,
    # but for simple retrieval, we can check here.
    if user_id != current_user_id and current_user_role != Role.ADMIN:
        logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to view user {user_id}'s profile.")
        return jsonify({"code": "FORBIDDEN", "message": "You are not authorized to view this user's profile."}), 403

    user = UserService.get_user_by_id(user_id)
    logger.info(f"User {current_user_id} retrieved user {user_id} details.")
    return jsonify(user.to_dict(include_email=True)), 200

@users_bp.route('/<int:user_id>', methods=['PUT'])
@rate_limit("10 per minute")
@jwt_and_roles_required(roles=[Role.USER, Role.ADMIN], fresh=True) # Require fresh token for sensitive update
@validate_json_body(UserUpdateSchema)
def update_user(args, user_id, current_user_id, current_user_role):
    """
    Update a specific user's details. (Admin or self access required, fresh token)
    ---
    tags:
      - Users
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: ID of the user to update.
      - in: body
        name: body
        schema:
          type: object
          properties:
            username: {type: string}
            email: {type: string, format: email}
            role:
              type: string
              enum: [admin, user]
              description: Only configurable by admin.
    responses:
      200:
        description: User successfully updated.
        schema:
          type: object
          properties:
            id: {type: integer}
            username: {type: string}
            email: {type: string}
            role: {type: string}
      400:
        $ref: '#/definitions/ErrorResponse'
      401:
        $ref: '#/definitions/ErrorResponse'
      403:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
      409:
        $ref: '#/definitions/ErrorResponse'
    """
    updated_user = UserService.update_user(user_id, current_user_id, current_user_role, args)
    logger.info(f"User {current_user_id} updated user {user_id} details.")
    # Invalidate cache for all users
    cache.delete_memoized(get_all_users)
    return jsonify(updated_user.to_dict(include_email=True)), 200

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@rate_limit("5 per minute")
@admin_required # Only admins can delete users
@jwt_and_roles_required(roles=[Role.ADMIN], fresh=True) # Require fresh token for sensitive action
def delete_user(user_id, current_user_id, current_user_role):
    """
    Delete a specific user by ID. (Admin access required, fresh token)
    ---
    tags:
      - Users
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: ID of the user to delete.
    responses:
      204:
        description: User successfully deleted.
      401:
        $ref: '#/definitions/ErrorResponse'
      403:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
    """
    UserService.delete_user(user_id, current_user_id, current_user_role)
    logger.info(f"Admin {current_user_id} deleted user {user_id}.")
    # Invalidate cache for all users
    cache.delete_memoized(get_all_users)
    return '', 204
```