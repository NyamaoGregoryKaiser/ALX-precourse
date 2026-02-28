from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required, get_jwt
from app.database import db
from app.models.user import User
from app.utils.errors import UnauthorizedError, BadRequestError, ForbiddenError
from datetime import timedelta

class AuthService:
    """
    Handles user authentication, registration, token generation, and revocation.
    """

    @staticmethod
    def register_user(username, email, password):
        """Registers a new user."""
        if User.query.filter_by(email=email).first():
            raise ConflictError("User with this email already exists.")
        if User.query.filter_by(username=username).first():
            raise ConflictError("User with this username already exists.")

        new_user = User(username=username, email=email)
        new_user.set_password(password)
        
        # Assign default 'CUSTOMER' role
        customer_role = UserRole.query.filter_by(name='CUSTOMER').first()
        if not customer_role:
            current_app.logger.warning("Default 'CUSTOMER' role not found during user registration.")
            raise InternalServerError("Default user role configuration error.")
        new_user.roles.append(customer_role)

        db.session.add(new_user)
        db.session.commit()
        current_app.logger.info(f"New user registered: {email}")
        return new_user

    @staticmethod
    def authenticate_user(email, password):
        """Authenticates a user and generates JWT tokens."""
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password) or not user.is_active:
            raise UnauthorizedError("Invalid credentials or account is inactive.")

        # Prepare user claims (e.g., roles)
        claims = {
            "roles": [role.name for role in user.roles],
            "email": user.email
        }

        access_token = create_access_token(identity=user.id, additional_claims=claims, fresh=True)
        refresh_token = create_refresh_token(identity=user.id, additional_claims=claims)
        current_app.logger.info(f"User {email} authenticated successfully.")
        return {"access_token": access_token, "refresh_token": refresh_token}

    @staticmethod
    @jwt_required(refresh=True)
    def refresh_access_token():
        """Refreshes an access token using a refresh token."""
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            raise UnauthorizedError("User not found.")

        claims = {
            "roles": [role.name for role in user.roles],
            "email": user.email
        }
        new_access_token = create_access_token(identity=current_user_id, additional_claims=claims, fresh=False)
        current_app.logger.info(f"Access token refreshed for user ID: {current_user_id}")
        return {"access_token": new_access_token}

    @staticmethod
    @jwt_required()
    def logout_user():
        """Revokes the current access token."""
        # For a simple JWT setup, logout means the client discards the token.
        # For token revocation, a blacklist mechanism (e.g., Redis) would be needed.
        # This example assumes client-side token discarding.
        # If token blacklisting is implemented, add the JWT ID to the blacklist here.
        jti = get_jwt()["jti"]
        # Add jti to a Redis blacklist (e.g., `setex(jti, expire_time, 'true')`)
        current_app.logger.info(f"User {get_jwt_identity()} logged out (client-side token discarded).")
        return {"message": "Successfully logged out."}