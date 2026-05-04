```python
# app/services/user_service.py
from app.models.user_model import User, Role
from app.core.db import db
from app.utils.errors import NotFoundError, ConflictError
from app.utils.logger import logger

class UserService:
    @staticmethod
    def create_user(username, email, password, role_name='User'):
        """Creates a new user with a specified role."""
        if User.find_by_username(username):
            raise ConflictError("Username already exists.")
        if User.find_by_email(email):
            raise ConflictError("Email already exists.")

        role = Role.query.filter_by(name=role_name).first()
        if not role:
            logger.warning(f"Role '{role_name}' not found. Defaulting to 'User'.")
            role = Role.query.filter_by(name='User').first()
            if not role:
                raise NotFoundError("Default 'User' role not found. Please seed roles first.")

        user = User(username=username, email=email, role=role)
        user.set_password(password)
        user.save()
        logger.info(f"User {username} created with role {role_name}.")
        return user

    @staticmethod
    def get_all_users():
        """Retrieves all users."""
        return User.get_all()

    @staticmethod
    def get_user_by_id(user_id):
        """Retrieves a user by their ID."""
        user = User.get_by_id(user_id)
        if not user:
            raise NotFoundError(f"User with id {user_id} not found.")
        return user

    @staticmethod
    def update_user(user_id, data):
        """Updates an existing user's information."""
        user = UserService.get_user_by_id(user_id)
        
        if 'username' in data and data['username'] != user.username:
            if User.find_by_username(data['username']):
                raise ConflictError("Username already taken.")
            user.username = data['username']
        
        if 'email' in data and data['email'] != user.email:
            if User.find_by_email(data['email']):
                raise ConflictError("Email already taken.")
            user.email = data['email']
            
        if 'password' in data:
            user.set_password(data['password'])
        
        if 'is_active' in data:
            user.is_active = data['is_active']
            
        if 'role_name' in data:
            new_role = Role.query.filter_by(name=data['role_name']).first()
            if not new_role:
                raise NotFoundError(f"Role '{data['role_name']}' not found.")
            user.role = new_role

        user.save()
        logger.info(f"User {user_id} updated.")
        return user

    @staticmethod
    def delete_user(user_id):
        """Deletes a user by their ID."""
        user = UserService.get_user_by_id(user_id)
        user.delete()
        logger.info(f"User {user_id} deleted.")
        return True
    
    @staticmethod
    def get_all_roles():
        """Retrieves all roles."""
        return Role.get_all()

    @staticmethod
    def get_role_by_id(role_id):
        """Retrieves a role by its ID."""
        role = Role.query.get(role_id)
        if not role:
            raise NotFoundError(f"Role with id {role_id} not found.")
        return role
```