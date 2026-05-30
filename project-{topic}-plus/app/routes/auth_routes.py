```python
from flask import Blueprint, request, jsonify, current_app, g
from app.utils.errors import BadRequestError, UnauthorizedError, ConflictError, ServerError
from app.services.user_service import UserService
from app.schemas.user import user_register_schema, user_login_schema, user_schema
from app.models.user import User, UserRole
from app.utils.jwt_handlers import create_auth_tokens, revoke_token, REVOKED_TOKENS
from app.utils.decorators import jwt_required_wrapper
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required, create_access_token, jwt_refresh_token_required
from http import HTTPStatus
from app.extensions import limiter

auth_bp = Blueprint('auth_bp', __name__)
user_service = UserService()

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute", error_message="Too many registration attempts.")
def register_user():
    """
    Registers a new user.
    Required: username, email, password.
    Optional: role (defaults to 'user' unless admin is registering another admin/editor).
    """
    current_app.logger.info("Received request to register user.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    # Validate input with schema
    errors = user_register_schema.validate(data)
    if errors:
        raise BadRequestError(f"Validation errors: {errors}")

    # For now, all registrations default to USER role.
    # An admin could be added to allow 'admin' or 'editor' role assignment.
    # For simplicity, we're not implementing admin-level role assignment on initial register.
    if 'role' in data and data['role'] != UserRole.USER.value:
        current_app.logger.warning(f"Attempted to register user with role '{data['role']}'. Defaulting to 'user'.")
        data['role'] = UserRole.USER.value

    try:
        user = user_service.create_user(data)
        return jsonify({"message": "User registered successfully", "user": user}), HTTPStatus.CREATED
    except (BadRequestError, ConflictError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to register user: {e}", exc_info=True)
        raise ServerError("An error occurred during user registration.")

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute", error_message="Too many login attempts.")
def login_user():
    """
    Authenticates a user and provides JWT access and refresh tokens.
    Required: username, password.
    """
    current_app.logger.info("Received request for user login.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    # Validate input with schema
    errors = user_login_schema.validate(data)
    if errors:
        raise BadRequestError(f"Validation errors: {errors}")

    username = data.get('username')
    password = data.get('password')

    try:
        user = user_service.get_user_by_username(username) # This returns a model object, not schema dump
        
        if not user or not user.check_password(password):
            current_app.logger.warning(f"Failed login attempt for username: {username}")
            raise UnauthorizedError("Invalid username or password.")
        
        if not user.is_active:
            current_app.logger.warning(f"Login attempt for inactive user: {username}")
            raise ForbiddenError("User account is inactive. Please contact support.")

        access_token, refresh_token = create_auth_tokens(user.id, user.role.value, fresh=True)
        current_app.logger.info(f"User '{username}' logged in successfully.")
        return jsonify(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role.value
            }
        ), HTTPStatus.OK
    except NotFoundError as e: # Catch NotFoundError specifically from get_user_by_username
        raise UnauthorizedError("Invalid username or password.")
    except UnauthorizedError as e:
        raise e
    except ForbiddenError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to login user: {e}", exc_info=True)
        raise ServerError("An error occurred during login.")

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True) # Requires a refresh token
@limiter.limit("3 per minute", error_message="Too many refresh attempts.")
def refresh_token():
    """
    Refreshes an access token using a valid refresh token.
    """
    current_app.logger.info("Received request to refresh access token.")
    identity = get_jwt_identity()
    user = User.query.get(identity)

    if not user:
        current_app.logger.warning(f"Refresh token for non-existent user ID: {identity}")
        raise UnauthorizedError("User associated with refresh token not found.")
    
    if not user.is_active:
        current_app.logger.warning(f"Refresh token for inactive user ID: {identity}")
        raise ForbiddenError("User account is inactive.")

    new_access_token = create_access_token(identity=user.id, fresh=False, additional_claims={"role": user.role.value})
    current_app.logger.info(f"Access token refreshed for user ID: {identity}")
    return jsonify(access_token=new_access_token), HTTPStatus.OK

@auth_bp.route('/logout', methods=['POST'])
@jwt_required_wrapper # Requires either access or refresh token
@limiter.limit("10 per minute", error_message="Too many logout attempts.")
def logout_user():
    """
    Logs out a user by revoking their current access/refresh token.
    """
    current_app.logger.info("Received request for user logout.")
    jti = get_jwt()["jti"] # Get the JWT ID
    revoke_token(jti)
    current_app.logger.info(f"Token with JTI {jti} revoked for user ID: {g.current_user.id}.")
    return jsonify({"message": "Successfully logged out"}), HTTPStatus.OK

@auth_bp.route('/protected', methods=['GET'])
@jwt_required_wrapper
@limiter.limit("60 per minute", error_message="Too many protected resource requests.")
def protected_route():
    """
    Example of a protected route.
    """
    current_app.logger.info(f"Accessing protected route as user ID: {g.current_user.id}")
    return jsonify(logged_in_as=g.current_user.username, role=g.current_user.role.value), HTTPStatus.OK

```