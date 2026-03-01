```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, current_user
from marshmallow import ValidationError
from app.services.user_service import UserService
from app.schemas import UserSchema, UserRegisterSchema
from app.utils.decorators import admin_or_owner_required, admin_required
import uuid

users_bp = Blueprint('users', __name__)
user_schema = UserSchema()
user_update_schema = UserRegisterSchema(partial=True) # Allow partial updates for user profile

@users_bp.route('/<uuid:user_id>', methods=['GET'])
@jwt_required()
@admin_or_owner_required('user_id')
def get_user_profile(user_id):
    """
    Get user profile by ID. Only accessible by the user themselves or an admin.
    ---
    get:
      summary: Get user profile
      parameters:
        - in: path
          name: user_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the user to retrieve
      security:
        - BearerAuth: []
      responses:
        200:
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        401:
          description: Unauthorized
        403:
          description: Forbidden
        404:
          description: User not found
    """
    user_data = UserService.get_user_by_id(user_id)
    if not user_data:
        return jsonify({"message": "User not found"}), 404
    return jsonify(user_data), 200

@users_bp.route('/<uuid:user_id>', methods=['PUT'])
@jwt_required()
@admin_or_owner_required('user_id')
def update_user_profile(user_id):
    """
    Update user profile by ID. Only accessible by the user themselves or an admin.
    ---
    put:
      summary: Update user profile
      parameters:
        - in: path
          name: user_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the user to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username: { type: string, description: New username }
                email: { type: string, format: email, description: New email }
                password: { type: string, format: password, description: New password }
      security:
        - BearerAuth: []
      responses:
        200:
          description: User profile updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        400:
          description: Invalid input or data conflict
        401:
          description: Unauthorized
        403:
          description: Forbidden
        404:
          description: User not found
    """
    try:
        data = user_update_schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400

    try:
        updated_user = UserService.update_user_profile(user_id, data)
        if not updated_user:
            return jsonify({"message": "User not found"}), 404
        return jsonify(updated_user), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error updating user {user_id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@users_bp.route('/<uuid:user_id>', methods=['DELETE'])
@jwt_required()
@admin_or_owner_required('user_id')
def delete_user(user_id):
    """
    Delete a user by ID. Only accessible by the user themselves or an admin.
    ---
    delete:
      summary: Delete user
      parameters:
        - in: path
          name: user_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the user to delete
      security:
        - BearerAuth: []
      responses:
        204:
          description: User deleted successfully
        401:
          description: Unauthorized
        403:
          description: Forbidden
        404:
          description: User not found
    """
    try:
        if UserService.delete_user(user_id):
            return '', 204
        return jsonify({"message": "User not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error deleting user {user_id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@users_bp.route('/', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    """
    Get all users (Admin only).
    ---
    get:
      summary: Get all users
      security:
        - BearerAuth: []
      responses:
        200:
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
        401:
          description: Unauthorized
        403:
          description: Forbidden
    """
    users = UserService.users_schema.dump(User.query.all())
    return jsonify(users), 200
```