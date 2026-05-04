```python
# app/api/auth_api.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, current_user
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.utils.errors import BadRequestError, UnauthorizedError, ConflictError
from app.middleware.rate_limiter import limiter
from app.utils.logger import logger

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute", error_message="Too many registration attempts. Please try again later.")
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
                email:
                  type: string
                  format: email
                  description: Unique email address
                password:
                  type: string
                  description: User password
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
                  message:
                    type: string
                  user:
                    type: object
                    properties:
                      id:
                        type: integer
                      username:
                        type: string
                      email:
                        type: string
        400:
          description: Bad request (missing fields)
        409:
          description: Conflict (username/email already exists)
    """
    data = request.get_json()
    if not data:
        raise BadRequestError("Request body must be JSON.")
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        raise BadRequestError("Username, email, and password are required.")

    try:
        user = AuthService.register_user(username, email, password)
        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict()
        }), 201
    except UnauthorizedError as e: # Catch UnauthorizedError from AuthService for existing user
        raise ConflictError(message=e.message, description=e.message)
    except Exception as e:
        logger.exception("Error during user registration.")
        raise BadRequestError(f"Registration failed: {str(e)}")


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute", key_func=get_jwt_identity, error_message="Too many login attempts for this IP/User. Please try again later.")
def login():
    """
    Authenticates a user and returns an access token.
    ---
    post:
      summary: Authenticate user and get JWT token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                password:
                  type: string
              required:
                - username
                - password
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  access_token:
                    type: string
                  user:
                    type: object
                    properties:
                      id:
                        type: integer
                      username:
                        type: string
                      email:
                        type: string
        401:
          description: Invalid credentials
    """
    data = request.get_json()
    if not data:
        raise BadRequestError("Request body must be JSON.")

    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        raise BadRequestError("Username and password are required.")

    try:
        access_token, user = AuthService.authenticate_user(username, password)
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": user.to_dict()
        }), 200
    except UnauthorizedError as e:
        raise UnauthorizedError(e.message)
    except Exception as e:
        logger.exception("Error during user login.")
        raise UnauthorizedError(f"Login failed: {str(e)}")

@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    """
    Example of a protected endpoint.
    ---
    get:
      summary: Access a protected resource
      security:
        - BearerAuth: []
      responses:
        200:
          description: Protected data
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  logged_in_as:
                    type: string
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    user = UserService.get_user_by_id(current_user_id)
    return jsonify(logged_in_as=user.username, message="Access granted to protected endpoint!"), 200

# Example of an endpoint that might get cached
@auth_bp.route('/cached-data', methods=['GET'])
# @cache.cached(timeout=60, key_prefix='cached_auth_data') # Caching can be applied
@jwt_required()
def get_cached_data():
    """
    Retrieves some cached data (example).
    ---
    get:
      summary: Get cached data
      security:
        - BearerAuth: []
      responses:
        200:
          description: Cached data
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: string
    """
    # Simulate fetching data that could be cached
    # For this example, we'll just return static data
    return jsonify(data="This is some data that could be cached for a user."), 200

```