from flask import request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, create_refresh_token, jwt_refresh_token_required
from app.api import bp
from app.extensions import db, bcrypt
from app.models import User
from app.schemas import UserLoginSchema, UserRegisterSchema
from marshmallow import ValidationError
from datetime import timedelta

# Initialize schemas
user_login_schema = UserLoginSchema()
user_register_schema = UserRegisterSchema()

@bp.route('/register', methods=['POST'])
def register():
    """
    User Registration
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        schema:
          id: UserRegister
          required:
            - username
            - email
            - password
          properties:
            username:
              type: string
              description: User's chosen username.
            email:
              type: string
              format: email
              description: User's email address.
            password:
              type: string
              format: password
              description: User's chosen password (min 6 chars).
    responses:
      201:
        description: User successfully registered.
      400:
        description: Invalid input or user already exists.
    """
    try:
        data = user_register_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify(err.messages), 400

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    current_app.logger.info(f"New user registered: {username} ({email})")
    return jsonify({"message": "User registered successfully"}), 201

@bp.route('/login', methods=['POST'])
def login():
    """
    User Login
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        schema:
          id: UserLogin
          required:
            - email
            - password
          properties:
            email:
              type: string
              format: email
              description: User's email address.
            password:
              type: string
              format: password
              description: User's password.
    responses:
      200:
        description: User successfully logged in. Returns access and refresh tokens.
        schema:
          properties:
            access_token:
              type: string
            refresh_token:
              type: string
      401:
        description: Invalid credentials.
    """
    try:
        data = user_login_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify(err.messages), 400

    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        # Create access and refresh tokens
        access_token = create_access_token(identity=user.id, expires_delta=current_app.config['JWT_ACCESS_TOKEN_EXPIRES'], additional_claims={"role": user.role})
        refresh_token = create_refresh_token(identity=user.id, expires_delta=current_app.config['JWT_REFRESH_TOKEN_EXPIRES'], additional_claims={"role": user.role})

        current_app.logger.info(f"User logged in: {user.username}")
        return jsonify(access_token=access_token, refresh_token=refresh_token), 200
    else:
        current_app.logger.warning(f"Failed login attempt for email: {email}")
        return jsonify({"message": "Invalid email or password"}), 401

@bp.route('/refresh', methods=['POST'])
@jwt_refresh_token_required # Requires a refresh token to generate a new access token
def refresh():
    """
    Refresh Access Token
    ---
    tags:
      - Authentication
    security:
      - refresh_token: []
    responses:
      200:
        description: New access token generated.
        schema:
          properties:
            access_token:
              type: string
      401:
        description: Invalid or expired refresh token.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 401

    new_access_token = create_access_token(identity=user.id, expires_delta=current_app.config['JWT_ACCESS_TOKEN_EXPIRES'], additional_claims={"role": user.role})
    current_app.logger.info(f"Access token refreshed for user: {user.username}")
    return jsonify(access_token=new_access_token), 200

@bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    """
    Protected Endpoint Example
    ---
    tags:
      - Authentication
    security:
      - jwt: []
    responses:
      200:
        description: Access granted.
        schema:
          properties:
            message:
              type: string
            logged_in_as:
              type: string
      401:
        description: Missing or invalid token.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return jsonify(logged_in_as=user.username, message="You have access to a protected resource!"), 200
```