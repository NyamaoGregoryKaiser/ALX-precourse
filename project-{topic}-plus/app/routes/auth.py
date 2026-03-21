from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.services.auth_service import AuthService
from app.schemas import AuthSchema, validate_json_body
from app.utils.decorators import jwt_refresh_token_required, rate_limit
from app.models import Role, REVOKED_TOKENS
import logging

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/register', methods=['POST'])
@rate_limit("5 per minute;100 per day")
@validate_json_body(AuthSchema)
def register(args):
    """
    Register a new user.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - username
            - email
            - password
          properties:
            username:
              type: string
              description: Unique username
              minLength: 3
              maxLength: 80
            email:
              type: string
              format: email
              description: User's email address
              minLength: 5
              maxLength: 120
            password:
              type: string
              description: User's password (min 6 characters)
              minLength: 6
    responses:
      201:
        description: User successfully registered.
        schema:
          type: object
          properties:
            msg:
              type: string
            user_id:
              type: integer
            username:
              type: string
      400:
        $ref: '#/definitions/ErrorResponse'
      409:
        $ref: '#/definitions/ErrorResponse'
    """
    username = args['username']
    email = args['email']
    password = args['password']

    # For simplicity, during registration, all users are 'USER' role by default.
    # An admin user could be created via a seed script or a dedicated admin endpoint.
    user = AuthService.register_user(username, email, password, role=Role.USER)

    return jsonify({"msg": "User registered successfully", "user_id": user.id, "username": user.username}), 201

@auth_bp.route('/login', methods=['POST'])
@rate_limit("10 per minute;200 per day")
@validate_json_body(AuthSchema(exclude=('email',))) # Email not required for login
def login(args):
    """
    Authenticate a user and get JWT tokens.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              description: User's username
            password:
              type: string
              description: User's password
    responses:
      200:
        description: Successfully logged in.
        schema:
          type: object
          properties:
            access_token:
              type: string
            refresh_token:
              type: string
      401:
        $ref: '#/definitions/ErrorResponse'
      400:
        $ref: '#/definitions/ErrorResponse'
    """
    username = args['username']
    password = args['password']

    access_token, refresh_token = AuthService.authenticate_user(username, password)
    return jsonify(access_token=access_token, refresh_token=refresh_token), 200

@auth_bp.route('/refresh', methods=['POST'])
@rate_limit("5 per hour")
@jwt_refresh_token_required
def refresh(jti):
    """
    Refresh an expired access token using a valid refresh token.
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: New access token generated.
        schema:
          type: object
          properties:
            access_token:
              type: string
      401:
        $ref: '#/definitions/ErrorResponse'
    """
    # jti is passed by jwt_refresh_token_required
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user_id, fresh=False)
    logger.info(f"User {current_user_id} refreshed access token.")
    return jsonify(access_token=new_access_token), 200

@auth_bp.route('/logout', methods=['POST'])
@rate_limit("10 per hour")
@jwt_refresh_token_required # Use refresh token to logout from all devices
def logout(jti):
    """
    Logout a user by revoking the refresh token.
    This also invalidates all associated access tokens (if not already expired).
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: User successfully logged out.
        schema:
          type: object
          properties:
            msg:
              type: string
      401:
        $ref: '#/definitions/ErrorResponse'
    """
    # jti is passed by jwt_refresh_token_required
    AuthService.revoke_token(jti)
    current_user_id = get_jwt_identity()
    logger.info(f"User {current_user_id} logged out (refresh token JTI: {jti} revoked).")
    return jsonify({"msg": "Successfully logged out"}), 200

@auth_bp.route('/me', methods=['GET'])
@rate_limit("30 per minute")
@jwt_required()
def get_current_user_info():
    """
    Get information about the current authenticated user.
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: Current user's details.
        schema:
          type: object
          properties:
            id:
              type: integer
            username:
              type: string
            email:
              type: string
            role:
              type: string
            created_at:
              type: string
              format: date-time
      401:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
    """
    current_user_id = get_jwt_identity()
    current_user = AuthService.get_user_by_id(current_user_id) # Direct call to service
    logger.debug(f"Fetched info for user ID {current_user_id}.")
    return jsonify(current_user.to_dict(include_email=True)), 200
```