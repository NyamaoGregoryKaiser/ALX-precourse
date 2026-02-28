from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from webargs.flaskparser import use_args
from app.schemas.user import UserRegisterSchema, UserLoginSchema, UserSchema
from app.services.auth_service import AuthService
from app.utils.errors import APIError, ConflictError, UnauthorizedError, BadRequestError
from app.extensions import limiter, smorest_api
from flask_smorest import Blueprint as SmorestBlueprint

auth_bp = SmorestBlueprint('auth', __name__, description='Authentication and User Management')

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute", methods=["POST"])
@auth_bp.arguments(UserRegisterSchema)
@auth_bp.response(201, UserSchema)
@auth_bp.doc(summary="Register a new user",
             description="Creates a new user account with a unique username and email.")
def register(user_data):
    """
    Registers a new user.
    """
    try:
        user = AuthService.register_user(**user_data)
        return user, 201
    except ConflictError as e:
        auth_bp.abort(409, message=str(e))
    except APIError as e:
        auth_bp.abort(e.status_code, message=str(e))
    except Exception as e:
        auth_bp.abort(500, message="An unexpected error occurred during registration.")


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute", methods=["POST"])
@auth_bp.arguments(UserLoginSchema)
@auth_bp.response(200, description="Returns access and refresh tokens")
@auth_bp.doc(summary="Login a user",
             description="Authenticates a user and provides JWT access and refresh tokens.")
def login(login_data):
    """
    Logs in a user and returns JWT tokens.
    """
    try:
        tokens = AuthService.authenticate_user(**login_data)
        return jsonify(tokens), 200
    except UnauthorizedError as e:
        auth_bp.abort(401, message=str(e))
    except APIError as e:
        auth_bp.abort(e.status_code, message=str(e))
    except Exception as e:
        auth_bp.abort(500, message="An unexpected error occurred during login.")


@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("10 per hour", methods=["POST"])
@jwt_required(refresh=True)
@auth_bp.response(200, description="Returns a new access token")
@auth_bp.doc(summary="Refresh access token",
             description="Generates a new access token using a valid refresh token.")
def refresh():
    """
    Refreshes an expired access token using a refresh token.
    """
    try:
        tokens = AuthService.refresh_access_token()
        return jsonify(tokens), 200
    except UnauthorizedError as e:
        auth_bp.abort(401, message=str(e))
    except APIError as e:
        auth_bp.abort(e.status_code, message=str(e))
    except Exception as e:
        auth_bp.abort(500, message="An unexpected error occurred during token refresh.")


@auth_bp.route('/logout', methods=['POST'])
@limiter.limit("60 per hour", methods=["POST"])
@jwt_required()
@auth_bp.response(200, description="Logs out the user")
@auth_bp.doc(summary="Logout user",
             description="Invalidates the current access token (client-side discard).")
def logout():
    """
    Logs out the current user (client-side token discard).
    """
    try:
        response = AuthService.logout_user()
        return jsonify(response), 200
    except APIError as e:
        auth_bp.abort(e.status_code, message=str(e))
    except Exception as e:
        auth_bp.abort(500, message="An unexpected error occurred during logout.")

# Basic endpoint to get current user info for authenticated users
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
@auth_bp.response(200, UserSchema)
@auth_bp.doc(summary="Get current user info",
             description="Retrieves the profile information of the authenticated user.")
def get_current_user():
    """
    Retrieves the profile information of the authenticated user.
    """
    from app.services.user_service import UserService # Avoid circular import at top level
    try:
        user_id = get_jwt_identity()
        user = UserService.get_user_by_id(user_id)
        return user
    except NotFoundError as e:
        auth_bp.abort(404, message=str(e))
    except APIError as e:
        auth_bp.abort(e.status_code, message=str(e))
    except Exception as e:
        auth_bp.abort(500, message="An unexpected error occurred while fetching user info.")