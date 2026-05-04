```python
# app/services/auth_service.py
from flask_jwt_extended import create_access_token
from app.models.user_model import User
from app.utils.errors import UnauthorizedError
from datetime import timedelta
from app.utils.logger import logger

class AuthService:
    @staticmethod
    def register_user(username, email, password):
        """Registers a new user."""
        if User.find_by_username(username):
            raise UnauthorizedError("Username already exists.")
        if User.find_by_email(email):
            raise UnauthorizedError("Email already exists.")

        user = User(username=username, email=email)
        user.set_password(password)
        user.save()
        logger.info(f"User {username} registered successfully.")
        return user

    @staticmethod
    def authenticate_user(username, password):
        """Authenticates a user and returns a JWT token."""
        user = User.find_by_username(username)
        if user and user.check_password(password):
            if not user.is_active:
                raise UnauthorizedError("Account is inactive.")
            
            # Create a JWT token with additional claims (e.g., user_id, roles)
            access_token = create_access_token(identity=user.id, additional_claims={
                "username": user.username,
                "email": user.email,
                "role": user.role.name
            }, expires_delta=timedelta(days=User.app.config['JWT_ACCESS_TOKEN_EXPIRES_DAYS'])) # Assuming app context for config
            
            logger.info(f"User {username} authenticated successfully.")
            return access_token, user
        raise UnauthorizedError("Invalid username or password.")
```