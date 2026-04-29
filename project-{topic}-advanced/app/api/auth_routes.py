from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, unset_jwt_cookies
from datetime import timedelta
from app.database import db
from app.models import User
from app.utils.errors import APIError
from app.utils.helpers import hash_password, verify_password
from app.extensions import limiter

auth_api_bp = Blueprint('auth_api', __name__)

@auth_api_bp.route('/register', methods=['POST'])
@limiter.limit("5 per hour") # Prevent registration spam
def register_user():
    """
    Register a new user.
    Requires: username, password, email (optional) in JSON body.
    Returns: success message.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password:
        raise APIError("Username and password are required", status_code=400)

    if User.query.filter_by(username=username).first():
        raise APIError("Username already exists", status_code=409)
    
    if email and User.query.filter_by(email=email).first():
        raise APIError("Email already registered", status_code=409)

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@auth_api_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute") # Prevent brute-force attacks
def login_user_api():
    """
    Authenticate a user and provide a JWT access token.
    Requires: username, password in JSON body.
    Returns: access_token.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        raise APIError("Username and password are required", status_code=400)

    user = User.query.filter_by(username=username).first()

    if user is None or not user.check_password(password):
        raise APIError("Invalid credentials", status_code=401)

    access_token = create_access_token(identity=user.id, expires_delta=current_app.config['JWT_ACCESS_TOKEN_EXPIRES'])
    return jsonify(access_token=access_token), 200

@auth_api_bp.route('/me', methods=['GET'])
@jwt_required()
@limiter.limit("60 per hour", override_defaults=True)
def get_current_user():
    """
    Get current authenticated user's details.
    Requires: valid JWT.
    Returns: User details.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        raise APIError("User not found", status_code=404)
    return jsonify(user.to_dict()), 200

@auth_api_bp.route('/logout', methods=['POST'])
@jwt_required()
@limiter.limit("60 per hour", override_defaults=True)
def logout_user_api():
    """
    Log out a user by revoking their token (although JWTs are stateless, 
    this simulates logout by simply removing cookies or instructing client to discard token).
    Requires: valid JWT.
    Returns: success message.
    """
    response = jsonify({"message": "Logged out successfully"})
    unset_jwt_cookies(response) # For cookie-based JWTs, remove the cookies
    return response, 200
```