```python
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, decode_token
from app.extensions import jwt, limiter
from app.models.user import User
from app.services.user_service import UserService
from app.utils.decorators import log_route_access, admin_required
from app.utils.exceptions import InvalidInput, ResourceNotFound, AuthenticationError

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute", error_message="Too many registration attempts. Please try again later.")
@log_route_access
def register():
    data = request.get_json()
    try:
        user = UserService.create_user(data)
        return jsonify(user.to_dict(include_email=True, include_role=True)), 201
    except (InvalidInput, ResourceNotFound) as e:
        return jsonify(message=str(e)), 400
    except Exception as e:
        logger.exception("Error during user registration")
        return jsonify(message="An unexpected error occurred during registration."), 500

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute", error_message="Too many login attempts. Please try again later.")
@log_route_access
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        raise InvalidInput("Username and password are required.")

    try:
        user = UserService.get_user_by_username(username)
        if user and user.check_password(password):
            if not user.is_active:
                raise AuthenticationError("Account is inactive. Please contact support.")

            access_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
            refresh_token = create_refresh_token(identity=user.id)
            logger.info(f"User {username} logged in successfully.")
            return jsonify(
                access_token=access_token,
                refresh_token=refresh_token,
                user=user.to_dict(include_email=True, include_role=True)
            ), 200
        else:
            raise AuthenticationError("Invalid username or password.")
    except (ResourceNotFound, AuthenticationError) as e:
        return jsonify(message=str(e)), 401
    except Exception as e:
        logger.exception("Error during user login")
        return jsonify(message="An unexpected error occurred during login."), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("5 per hour", error_message="Too many refresh attempts.")
@log_route_access
def refresh():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify(message="User not found"), 401
    
    new_access_token = create_access_token(identity=current_user_id, additional_claims={"role": user.role})
    return jsonify(access_token=new_access_token), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
@log_route_access
def logout():
    # In a real application, you might blacklist tokens here.
    # For now, we just acknowledge logout.
    logger.info(f"User {get_jwt_identity()} logged out.")
    return jsonify(message="Successfully logged out"), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
@log_route_access
def get_current_user():
    user_id = get_jwt_identity()
    try:
        user = UserService.get_user_by_id(user_id)
        return jsonify(user.to_dict(include_email=True, include_role=True)), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error retrieving current user {user_id}")
        return jsonify(message="An unexpected error occurred."), 500

@auth_bp.route('/check_admin', methods=['GET'])
@jwt_required()
@admin_required
@log_route_access
def check_admin():
    return jsonify(message="You have admin access!"), 200

```