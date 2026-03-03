import jwt
import datetime
from app import db, cache, celery_app
from app.models.user import User
from app.utils.errors import BadRequestError, UnauthorizedError
from flask import current_app

class AuthService:
    @staticmethod
    def register_user(username, email, password):
        if User.get_by_username(username):
            raise BadRequestError(f"Username '{username}' already exists.")
        if User.get_by_email(email):
            raise BadRequestError(f"Email '{email}' already exists.")

        user = User(username=username, email=email)
        user.set_password(password)
        user.save()
        current_app.logger.info(f"User {username} registered successfully.")
        return user

    @staticmethod
    def authenticate_user(username, password):
        user = User.get_by_username(username)
        if not user or not user.check_password(password):
            raise UnauthorizedError("Invalid username or password.")

        token = AuthService._generate_jwt_token(user.id)
        current_app.logger.info(f"User {username} authenticated successfully.")
        return token

    @staticmethod
    def _generate_jwt_token(user_id):
        payload = {
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=current_app.config['JWT_ACCESS_TOKEN_EXPIRES']),
            'iat': datetime.datetime.utcnow()
        }
        token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
        return token
```