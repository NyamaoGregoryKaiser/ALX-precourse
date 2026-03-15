from app import db
from app.models.user import User
from app.utils.errors import UnauthorizedError, BadRequestError, ConflictError
import logging

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def register_user(username, email, password, role='customer'):
        if User.query.filter_by(username=username).first():
            raise ConflictError("Username already taken.")
        if User.query.filter_by(email=email).first():
            raise ConflictError("Email already registered.")

        try:
            new_user = User(username=username, email=email, password=password, role=role)
            db.session.add(new_user)
            db.session.commit()
            logger.info(f"User {username} registered successfully.")
            return new_user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error registering user {username}: {e}")
            raise BadRequestError(f"Failed to register user: {e}")

    @staticmethod
    def authenticate_user(email, password):
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            logger.warning(f"Authentication failed for email: {email}")
            raise UnauthorizedError("Invalid credentials.")
        logger.info(f"User {user.username} authenticated successfully.")
        return user