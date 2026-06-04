```python
from app.extensions import db, bcrypt
from app.models import User, TokenBlocklist
from app.schemas import user_register_schema, user_schema
from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

def register_user(data):
    """
    Registers a new user.

    Args:
        data (dict): Dictionary containing user registration data (username, email, password).

    Returns:
        tuple: (user_data, status_code) on success, or (error_message, status_code) on failure.
    """
    try:
        # Validate input data using Marshmallow schema
        user_data = user_register_schema.load(data)
    except Exception as e:
        current_app.logger.error(f"User registration validation error: {e.messages}")
        return {"message": "Validation Error", "errors": e.messages}, 400

    # Check if user already exists
    if User.query.filter_by(username=user_data['username']).first():
        return {"message": "Username already taken."}, 409
    if User.query.filter_by(email=user_data['email']).first():
        return {"message": "Email already registered."}, 409

    try:
        new_user = User(
            username=user_data['username'],
            email=user_data['email'],
            password=user_data['password'] # Password hashing handled by model setter
        )
        db.session.add(new_user)
        db.session.commit()
        current_app.logger.info(f"User registered successfully: {new_user.username}")
        return user_schema.dump(new_user), 201
    except IntegrityError:
        db.session.rollback()
        current_app.logger.error(f"Integrity error during user registration for {user_data.get('username')}.")
        return {"message": "A user with this username or email already exists."}, 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(f"Error during user registration for {user_data.get('username')}: {e}")
        return {"message": "Could not register user due to an internal server error."}, 500

def authenticate_user(username, password):
    """
    Authenticates a user and generates JWT tokens.

    Args:
        username (str): The user's username.
        password (str): The user's password.

    Returns:
        tuple: (tokens, status_code) on success, or (error_message, status_code) on failure.
    """
    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        current_app.logger.warning(f"Failed login attempt for username: {username}")
        return {"message": "Invalid credentials."}, 401

    if not user.is_active:
        current_app.logger.warning(f"Login attempt by inactive user: {username}")
        return {"message": "Account is inactive. Please contact support."}, 403

    # Create access and refresh tokens
    # Extra claims can be added to the access token payload
    access_token = create_access_token(identity=str(user.id), fresh=True, additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims={"role": user.role})

    current_app.logger.info(f"User authenticated successfully: {user.username}")
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user_schema.dump(user)
    }, 200

def refresh_tokens(user_id, user_role):
    """
    Generates new access and refresh tokens using a valid refresh token.

    Args:
        user_id (str): The ID of the user.
        user_role (str): The role of the user.

    Returns:
        tuple: (tokens, status_code) on success, or (error_message, status_code) on failure.
    """
    new_access_token = create_access_token(identity=user_id, fresh=False, additional_claims={"role": user_role})
    new_refresh_token = create_refresh_token(identity=user_id, additional_claims={"role": user_role})

    current_app.logger.info(f"Tokens refreshed for user ID: {user_id}")
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token
    }, 200

def revoke_token(jti):
    """
    Revokes a JWT token by adding its JTI to the blocklist.

    Args:
        jti (str): The JTI (JWT ID) of the token to revoke.

    Returns:
        tuple: (message, status_code)
    """
    try:
        blocklisted_token = TokenBlocklist(jti=jti)
        db.session.add(blocklisted_token)
        db.session.commit()
        current_app.logger.info(f"Token with JTI {jti} revoked.")
        return {"message": "Token revoked successfully."}, 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error revoking token {jti}: {e}")
        return {"message": "Could not revoke token due to an internal server error."}, 500

def is_token_revoked(jti):
    """
    Checks if a given JTI exists in the token blocklist.

    Args:
        jti (str): The JTI (JWT ID) to check.

    Returns:
        bool: True if the token is revoked, False otherwise.
    """
    return db.session.query(TokenBlocklist.id).filter_by(jti=jti).first() is not None
```