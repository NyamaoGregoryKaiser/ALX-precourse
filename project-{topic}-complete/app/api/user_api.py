```python
# app/api/user_api.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.user_service import UserService
from app.utils.decorators import admin_required
from app.utils.errors import BadRequestError, NotFoundError, ConflictError
from app.utils.logger import logger

user_bp = Blueprint('user', __name__)

@user_bp.route('/', methods=['GET'])
@jwt_required()
@admin_required # Only admins can view all users
def get_users():
    """
    Retrieves a list of all users.
    ---
    get:
      summary: Get all users
      security:
        - BearerAuth: []
      responses:
        200:
          description: A list of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
        401:
          description: Unauthorized
        403:
          description: Forbidden (Admin role required)
    """
    users = UserService.get_all_users()
    return jsonify([user.to_dict() for user in users]), 200

@user_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required # Only admins can view specific user details (or self)
def get_user(user_id):
    """
    Retrieves a user by their ID.
    ---
    get:
      summary: Get a user by ID
      parameters:
        - in: path
          name: user_id
          schema:
            type: integer
          required: true
          description: ID of the user to retrieve
      security:
        - BearerAuth: []
      responses:
        200:
          description: User data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        404:
          description: User not found
        401:
          description: Unauthorized
        403:
          description: Forbidden (Admin role required)
    """
    try:
        user = UserService.get_user_by_id(user_id)
        return jsonify(user.to_dict()), 200
    except NotFoundError as e:
        raise NotFoundError(e.message)

@user_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required # Only admins can create new users directly via API
def create_user():
    """
    Creates a new user.
    ---
    post:
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                email:
                  type: string
                password:
                  type: string
                role_name:
                  type: string
                  default: User
              required:
                - username
                - email
                - password
      security:
        - BearerAuth: []
      responses:
        201:
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        400:
          description: Bad request (missing fields)
        409:
          description: Conflict (username/email already exists)
        401:
          description: Unauthorized
        403:
          description: Forbidden (Admin role required)
    """
    data = request.get_json()
    if not data:
        raise BadRequestError("Request body must be JSON.")
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role_name = data.get('role_name', 'User')

    if not all([username, email, password]):
        raise BadRequestError("Username, email, and password are required.")

    try:
        user = UserService.create_user(username, email, password, role_name)
        return jsonify(user.to_dict()), 201
    except (ConflictError, NotFoundError) as e:
        raise ConflictError(e.message)
    except Exception as e:
        logger.exception("Error creating user.")
        raise BadRequestError(f"Failed to create user: {str(e)}")


@user_bp.route('/<int:user_id>', methods=['PUT', 'PATCH'])
@jwt_required()
@admin_required # Only admins can update user details
def update_user(user_id):
    """
    Updates an existing user.
    ---
    put:
      summary: Update a user by ID
      parameters:
        - in: path
          name: user_id
          schema:
            type: integer
          required: true
          description: ID of the user to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                email:
                  type: string
                password:
                  type: string
                is_active:
                  type: boolean
                role_name:
                  type: string
      security:
        - BearerAuth: []
      responses:
        200:
          description: User updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        400:
          description: Bad request
        404:
          description: User not found
        409:
          description: Conflict (username/email already exists)
        401:
          description: Unauthorized
        403:
          description: Forbidden (Admin role required)
    """
    data = request.get_json()
    if not data:
        raise BadRequestError("Request body must be JSON.")

    try:
        user = UserService.update_user(user_id, data)
        return jsonify(user.to_dict()), 200
    except (NotFoundError, ConflictError) as e:
        raise e # Re-raise custom errors
    except Exception as e:
        logger.exception("Error updating user.")
        raise BadRequestError(f"Failed to update user: {str(e)}")


@user_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required # Only admins can delete users
def delete_user(user_id):
    """
    Deletes a user by their ID.
    ---
    delete:
      summary: Delete a user by ID
      parameters:
        - in: path
          name: user_id
          schema:
            type: integer
          required: true
          description: ID of the user to delete
      security:
        - BearerAuth: []
      responses:
        204:
          description: User deleted successfully
        404:
          description: User not found
        401:
          description: Unauthorized
        403:
          description: Forbidden (Admin role required)
    """
    try:
        UserService.delete_user(user_id)
        return jsonify({"message": "User deleted successfully"}), 204
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except Exception as e:
        logger.exception("Error deleting user.")
        raise BadRequestError(f"Failed to delete user: {str(e)}")

@user_bp.route('/roles', methods=['GET'])
@jwt_required()
@admin_required
def get_roles():
    """
    Retrieves a list of all roles.
    ---
    get:
      summary: Get all roles
      security:
        - BearerAuth: []
      responses:
        200:
          description: A list of roles
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
                    description:
                      type: string
        401:
          description: Unauthorized
        403:
          description: Forbidden (Admin role required)
    """
    roles = UserService.get_all_roles()
    return jsonify([role.to_dict() for role in roles]), 200

# Define OpenAPI Schema for User (for documentation)
# This would typically be in an external OpenAPI spec or a dedicated schema file
# but included here for completeness within Python context.
"""
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          readOnly: true
        email:
          type: string
          format: email
        username:
          type: string
        is_active:
          type: boolean
        role:
          type: string
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
        - username
        - email
"""
```