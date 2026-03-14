```python
import logging
from app.extensions import db, cache
from app.models.user import User
from app.utils.decorators import log_service_operation
from app.utils.exceptions import ResourceNotFound, DuplicateResource, InvalidInput

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    @log_service_operation
    def create_user(data):
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')

        if not username or not email or not password:
            raise InvalidInput("Username, email, and password are required.")

        if User.query.filter_by(username=username).first():
            raise DuplicateResource(f"User with username '{username}' already exists.")
        if User.query.filter_by(email=email).first():
            raise DuplicateResource(f"User with email '{email}' already exists.")

        try:
            user = User(username=username, email=email, password=password, role=role)
            db.session.add(user)
            db.session.commit()
            cache.delete_memoized(UserService.get_all_users) # Invalidate cache
            logger.info(f"User created: {user.username}")
            return user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user: {e}")
            raise

    @staticmethod
    @log_service_operation
    @cache.memoize(timeout=300) # Cache for 5 minutes
    def get_all_users(page=1, per_page=10):
        users = User.query.paginate(page=page, per_page=per_page, error_out=False)
        return users

    @staticmethod
    @log_service_operation
    @cache.memoize(timeout=300)
    def get_user_by_id(user_id):
        user = User.query.get(user_id)
        if not user:
            raise ResourceNotFound(f"User with ID '{user_id}' not found.")
        return user

    @staticmethod
    @log_service_operation
    def update_user(user_id, data):
        user = UserService.get_user_by_id(user_id) # Uses cached version if available
        
        if 'username' in data and data['username'] != user.username and \
           User.query.filter_by(username=data['username']).first():
            raise DuplicateResource(f"User with username '{data['username']}' already exists.")
        
        if 'email' in data and data['email'] != user.email and \
           User.query.filter_by(email=data['email']).first():
            raise DuplicateResource(f"User with email '{data['email']}' already exists.")

        try:
            user.username = data.get('username', user.username)
            user.email = data.get('email', user.email)
            if 'password' in data:
                user.set_password(data['password'])
            user.role = data.get('role', user.role)
            user.is_active = data.get('is_active', user.is_active)
            db.session.commit()
            cache.delete_memoized(UserService.get_all_users) # Invalidate list cache
            cache.delete_memoized(UserService.get_user_by_id, user_id) # Invalidate specific user cache
            logger.info(f"User updated: {user.username}")
            return user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user {user_id}: {e}")
            raise

    @staticmethod
    @log_service_operation
    def delete_user(user_id):
        user = UserService.get_user_by_id(user_id) # Uses cached version if available
        try:
            db.session.delete(user)
            db.session.commit()
            cache.delete_memoized(UserService.get_all_users)
            cache.delete_memoized(UserService.get_user_by_id, user_id)
            logger.info(f"User deleted: {user_id}")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting user {user_id}: {e}")
            raise

    @staticmethod
    @log_service_operation
    def get_user_by_username(username):
        user = User.query.filter_by(username=username).first()
        if not user:
            raise ResourceNotFound(f"User with username '{username}' not found.")
        return user

    @staticmethod
    @log_service_operation
    def get_user_by_email(email):
        user = User.query.filter_by(email=email).first()
        if not user:
            raise ResourceNotFound(f"User with email '{email}' not found.")
        return user
```