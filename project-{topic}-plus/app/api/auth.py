```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, current_user, get_jwt
from marshmallow import ValidationError
from datetime import timedelta

from app import jwt, db
from app.models import User, UserRole
from app.schemas import UserRegisterSchema, UserSchema
from app.services.user_service import UserService
from app.utils.decorators import admin_required

auth_bp = Blueprint('auth', __name__)

user_register_schema = UserRegisterSchema()
user_schema = UserSchema()

# This callback is used to load a user object from the database whenever
# a protected endpoint is accessed.
@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    return User.query.filter_by(id=identity).one_or_none()

@auth_bp.route('/register', methods=['POST'])
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
                username: { type: string, description: User's chosen username }
                email: { type: string, format: email, description: User's email address }
                password: { type: string, format: password, description: User's password (min 6 chars) }
      responses:
        201:
          description: User registered successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string }
                  user:
                    $ref: '#/components/schemas/User'
        400:
          description: Invalid input or user already exists
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string }
        500:
          description: Internal server error
    """
    try:
        data = user_register_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400

    try:
        user_data = UserService.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=data.get('role', UserRole.CUSTOMER)
        )
        return jsonify({"message": "User registered successfully", "user": user_data}), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error during registration: {e}")
        return jsonify({"message": "Internal server error"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Logs in a user and returns JWT access and refresh tokens.
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
                email: { type: string, format: email, description: User's email address }
                password: { type: string, format: password, description: User's password }
      responses:
        200:
          description: User logged in successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string }
                  access_token: { type: string }
                  refresh_token: { type: string }
                  user:
                    $ref: '#/components/schemas/User'
        401:
          description: Invalid credentials
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string }
        500:
          description: Internal server error
    """
    email = request.json.get('email', None)
    password = request.json.get('password', None)

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user_data = UserService.verify_user(email, password)

    if user_data:
        access_token = create_access_token(identity=user_data['id'], fresh=True)
        refresh_token = create_refresh_token(identity=user_data['id'])
        return jsonify(
            message="Logged in successfully",
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data
        ), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refreshes an expired access token using a refresh token.
    ---
    post:
      summary: Refresh access token
      security:
        - BearerAuth: []
      responses:
        200:
          description: New access token generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  access_token: { type: string }
        401:
          description: Invalid or expired refresh token
    """
    identity = get_jwt_identity()
    new_access_token = create_access_token(identity=identity, fresh=False)
    return jsonify(access_token=new_access_token), 200

@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    """
    Example protected endpoint.
    ---
    get:
      summary: Access protected resource
      security:
        - BearerAuth: []
      responses:
        200:
          description: Access granted
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string }
                  logged_in_as: { type: string }
                  user_role: { type: string }
        401:
          description: Unauthorized
    """
    # Access the user object via current_user
    return jsonify(
        message=f"Hello {current_user.username}, you are authorized!",
        logged_in_as=str(current_user.id),
        user_role=current_user.role.value
    ), 200

@auth_bp.route('/admin-only', methods=['GET'])
@jwt_required()
@admin_required
def admin_only():
    """
    Example admin-only protected endpoint.
    ---
    get:
      summary: Access admin-only resource
      security:
        - BearerAuth: []
      responses:
        200:
          description: Admin access granted
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string }
                  logged_in_as: { type: string }
                  user_role: { type: string }
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not an admin)
    """
    return jsonify(
        message=f"Hello Admin {current_user.username}, you have admin access!",
        logged_in_as=str(current_user.id),
        user_role=current_user.role.value
    ), 200
```