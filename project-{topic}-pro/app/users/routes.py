```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.users.services import UserService
from app.auth.decorators import role_required
from app.extensions import limiter

users_bp = Blueprint('users', __name__)

@users_bp.route('/', methods=['GET'])
@jwt_required()
@role_required(['admin']) # Only admins can list all users
@limiter.limit("30 per minute")
def list_users():
    """
    Retrieves a paginated list of all users. Requires admin role.
    ---
    get:
      summary: Get all users
      security:
        - access_token: []
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            default: 1
          description: Page number for pagination
        - in: query
          name: per_page
          schema:
            type: integer
            default: 10
          description: Number of items per page
      responses:
        200:
          description: A list of users
          content:
            application/json:
              schema:
                type: object
                properties:
                  users:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  total_pages:
                    type: integer
                  current_page:
                    type: integer
                  total_items:
                    type: integer
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        429:
          description: Too many requests
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    users, status_code = UserService.get_all_users(page=page, per_page=per_page)
    return jsonify(users), status_code

@users_bp.route('/<uuid:user_id>', methods=['GET'])
@jwt_required()
@limiter.limit("60 per minute")
def get_user(user_id):
    """
    Retrieves a single user by ID. Accessible by admin for any user,
    or by the user themselves for their own profile.
    ---
    get:
      summary: Get a user by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: user_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the user to retrieve
      responses:
        200:
          description: User details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        401:
          description: Unauthorized
        403:
          description: Forbidden (not authorized to view this user)
        404:
          description: User not found
        429:
          description: Too many requests
    """
    current_user_id = get_jwt_identity()
    current_user_role = get_jwt().get('role')

    # Allow users to retrieve their own profile, or admins to retrieve any profile
    if str(user_id) != current_user_id and current_user_role != 'admin':
        return jsonify({"message": "You are not authorized to view this user's profile."}), 403

    user, status_code = UserService.get_user_by_id(str(user_id))
    return jsonify(user), status_code

@users_bp.route('/<uuid:user_id>', methods=['PUT'])
@jwt_required()
@limiter.limit("30 per hour")
def update_user(user_id):
    """
    Updates a user's information. Accessible by admin for any user,
    or by the user themselves for their own profile (limited fields).
    Admins can modify all fields, including role. Other users cannot change roles.
    ---
    put:
      summary: Update a user by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: user_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the user to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                  example: updated_user
                email:
                  type: string
                  format: email
                  example: updated@example.com
                password:
                  type: string
                  format: password
                  example: NewStrongPassword!
                role:
                  type: string
                  enum: [admin, editor, author, contributor]
                  description: User's role (only editable by admin)
                is_active:
                  type: boolean
                  description: User account status (only editable by admin)
      responses:
        200:
          description: User updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        400:
          description: Invalid input data
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient permissions or not authorized)
        404:
          description: User not found
        409:
          description: Username or email already exists
        429:
          description: Too many requests
    """
    current_user_id = get_jwt_identity()
    current_user_role = get_jwt().get('role')
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400

    user, status_code = UserService.update_user(str(user_id), data, current_user_id, current_user_role)
    return jsonify(user), status_code

@users_bp.route('/<uuid:user_id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin']) # Only admins can delete users
@limiter.limit("10 per hour")
def delete_user(user_id):
    """
    Deletes a user by ID. Requires admin role.
    Admins cannot delete their own account.
    ---
    delete:
      summary: Delete a user by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: user_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the user to delete
      responses:
        200:
          description: User deleted successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: User deleted successfully
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role or cannot delete own account)
        404:
          description: User not found
        429:
          description: Too many requests
    """
    current_user_id = get_jwt_identity()
    current_user_role = get_jwt().get('role')

    message, status_code = UserService.delete_user(str(user_id), current_user_id, current_user_role)
    return jsonify(message), status_code
```