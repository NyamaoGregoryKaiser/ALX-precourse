import logging
from datetime import timedelta
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, decode_token
from app import db, jwt
from app.models import User, REVOKED_TOKENS
from app.utils.exceptions import ConflictError, NotFoundError, UnauthorizedError, ForbiddenError

logger = logging.getLogger(__name__)

class AuthService:
    """
    Service layer for user authentication and authorization.
    Handles user registration, login, token management, and revocation.
    """

    @staticmethod
    def register_user(username, email, password, role=None):
        """
        Registers a new user in the system.
        Args:
            username (str): The user's chosen username.
            email (str): The user's email address.
            password (str): The user's password (will be hashed).
            role (Role, optional): The user's role. Defaults to Role.USER.
        Returns:
            User: The newly created user object.
        Raises:
            ConflictError: If username or email already exists.
        """
        if User.query.filter_by(username=username).first():
            logger.warning(f"Registration failed: Username '{username}' already exists.")
            raise ConflictError("Username already exists.")
        if User.query.filter_by(email=email).first():
            logger.warning(f"Registration failed: Email '{email}' already exists.")
            raise ConflictError("Email already exists.")

        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()
        logger.info(f"User '{username}' registered successfully with ID: {new_user.id}")
        return new_user

    @staticmethod
    def authenticate_user(username, password):
        """
        Authenticates a user and generates JWT tokens.
        Args:
            username (str): The user's username.
            password (str): The user's password.
        Returns:
            tuple: (access_token, refresh_token)
        Raises:
            UnauthorizedError: If authentication fails.
        """
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            logger.warning(f"Authentication failed for user '{username}'.")
            raise UnauthorizedError("Invalid credentials.")

        # Create JWT tokens
        identity = user.id
        access_token = create_access_token(identity=identity, fresh=True)
        refresh_token = create_refresh_token(identity=identity)

        logger.info(f"User '{username}' authenticated successfully.")
        return access_token, refresh_token

    @staticmethod
    def refresh_access_token(refresh_token):
        """
        Refreshes an access token using a valid refresh token.
        Args:
            refresh_token (str): The refresh token.
        Returns:
            str: A new access token.
        Raises:
            UnauthorizedError: If the refresh token is invalid or revoked.
        """
        try:
            decoded_token = decode_token(refresh_token)
            if decoded_token['jti'] in REVOKED_TOKENS:
                logger.warning(f"Attempted refresh with revoked refresh token: {decoded_token['jti']}")
                raise UnauthorizedError("Refresh token has been revoked.")

            identity = get_jwt_identity() # Identity should be extracted by @jwt_required(refresh=True) decorator
            new_access_token = create_access_token(identity=identity, fresh=False)
            logger.info(f"Access token refreshed for user ID: {identity}")
            return new_access_token
        except Exception as e:
            logger.error(f"Error refreshing access token: {e}")
            raise UnauthorizedError("Invalid refresh token.")

    @staticmethod
    @jwt.token_in_blocklist_loader
    def check_if_token_is_revoked(jwt_header, jwt_payload):
        """
        Callback function to check if a JWT has been revoked.
        This is used by Flask-JWT-Extended.
        """
        jti = jwt_payload["jti"]
        is_revoked = jti in REVOKED_TOKENS
        logger.debug(f"Checking revocation for JTI {jti}: {is_revoked}")
        return is_revoked

    @staticmethod
    def revoke_token(jti):
        """
        Adds a token's JTI to the revoked tokens list.
        Args:
            jti (str): The JWT ID of the token to revoke.
        """
        REVOKED_TOKENS.add(jti)
        logger.info(f"Token with JTI '{jti}' revoked.")

    @staticmethod
    def get_current_user_id():
        """
        Retrieves the current user's ID from the JWT payload.
        Assumes `jwt_required()` has been called.
        """
        return get_jwt_identity()

    @staticmethod
    def get_current_user_role():
        """
        Retrieves the current user's role from the database.
        Assumes `jwt_required()` has been called.
        """
        user_id = AuthService.get_current_user_id()
        user = User.query.get(user_id)
        if not user:
            logger.error(f"User with ID {user_id} not found when fetching role.")
            raise NotFoundError("User not found.")
        return user.role
```