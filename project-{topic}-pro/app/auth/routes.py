```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.auth.services import register_user, authenticate_user, refresh_tokens, revoke_token
from app.auth.decorators import role_required
from app.schemas import user_register_schema # Import for API docs example
from app.extensions import limiter

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per hour", error_message="Too many registration attempts. Please try again later.")
def register():
    """
    Registers a new user.
    ---
    post:
      summary: Register a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                  description: Unique username
                  example: newuser
                email:
                  type: string
                  format: email
                  description: Unique email address
                  example: newuser@example.com
                password:
                  type: string
                  format: password
                  description: User password (min 8 characters)
                  example: StrongPassword123
              required:
                - username
                - email
                - password
      responses:
        201:
          description: User registered successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  username:
                    type: string
                  email:
                    type: string
                  role:
                    type: string
        400:
          description: Invalid input data
        409:
          description: Username or email already exists
        429:
          description: Too many requests
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400

    user_info, status_code = register_user(data)
    return jsonify(user_info), status_code

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute", error_message="Too many login attempts. Please wait.")
def login():
    """
    Authenticates a user and returns JWT access and refresh tokens.
    ---
    post:
      summary: Login a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                  example: testuser
                password:
                  type: string
                  format: password
                  example: password123
              required:
                - username
                - password
      responses:
        200:
          description: User logged in successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  access_token:
                    type: string
                  refresh_token:
                    type: string
                  user:
                    type: object
                    properties:
                      id:
                        type: string
                      username:
                        type: string
                      email:
                        type: string
                      role:
                        type: string
        401:
          description: Invalid credentials
        429:
          description: Too many requests
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    tokens, status_code = authenticate_user(username, password)
    return jsonify(tokens), status_code

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True) # Requires a valid refresh token
@limiter.limit("3 per minute", error_message="Too many refresh attempts. Please wait.")
def refresh():
    """
    Refreshes expired access tokens using a refresh token.
    ---
    post:
      summary: Refresh JWT tokens
      security:
        - refresh_token: []
      responses:
        200:
          description: New access and refresh tokens provided
          content:
            application/json:
              schema:
                type: object
                properties:
                  access_token:
                    type: string
                  refresh_token:
                    type: string
        401:
          description: Invalid or expired refresh token
        429:
          description: Too many requests
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    user_role = claims.get('role')

    tokens, status_code = refresh_tokens(current_user_id, user_role)
    return jsonify(tokens), status_code

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
@limiter.limit("10 per hour", error_message="Too many logout attempts.")
def logout():
    """
    Revokes the current access token.
    ---
    post:
      summary: Logout user (revoke access token)
      security:
        - access_token: []
      responses:
        200:
          description: Access token revoked
        401:
          description: Missing or invalid token
        429:
          description: Too many requests
    """
    jti = get_jwt()["jti"] # Get the unique identifier of the JWT
    message, status_code = revoke_token(jti)
    return jsonify(message), status_code

@auth_bp.route('/logout_refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("10 per hour", error_message="Too many logout attempts.")
def logout_refresh():
    """
    Revokes the current refresh token.
    ---
    post:
      summary: Logout user (revoke refresh token)
      security:
        - refresh_token: []
      responses:
        200:
          description: Refresh token revoked
        401:
          description: Missing or invalid refresh token
        429:
          description: Too many requests
    """
    jti = get_jwt()["jti"]
    message, status_code = revoke_token(jti)
    return jsonify(message), status_code

@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    """
    A protected endpoint accessible with a valid access token.
    ---
    get:
      summary: Access a protected resource
      security:
        - access_token: []
      responses:
        200:
          description: Access granted
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Hello from protected endpoint, user <user_id>!
                  user_id:
                    type: string
                  user_role:
                    type: string
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "message": f"Hello from protected endpoint, user {current_user_id}!",
        "user_id": current_user_id,
        "user_role": claims.get('role')
    }), 200

@auth_bp.route('/admin_only', methods=['GET'])
@jwt_required()
@role_required(['admin'])
def admin_only():
    """
    An endpoint accessible only by users with 'admin' role.
    ---
    get:
      summary: Access an admin-only resource
      security:
        - access_token: []
      responses:
        200:
          description: Admin access granted
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Welcome, Admin! This is a secret admin page.
                  user_id:
                    type: string
                  user_role:
                    type: string
        401:
          description: Unauthorized (missing or invalid token)
        403:
          description: Forbidden (insufficient role)
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "message": f"Welcome, Admin! This is a secret admin page.",
        "user_id": current_user_id,
        "user_role": claims.get('role')
    }), 200
```