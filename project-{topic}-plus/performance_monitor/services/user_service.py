```python
from performance_monitor.extensions import db
from performance_monitor.models import User
from flask import current_app

class UserService:
    """
    Business logic for User management.
    """

    @staticmethod
    def create_user(username, email, password, is_admin=False):
        """Creates a new user."""
        if User.query.filter_by(username=username).first():
            return None, "Username already exists."
        if User.query.filter_by(email=email).first():
            return None, "Email already registered."

        user = User(username=username, email=email, is_admin=is_admin)
        user.set_password(password)
        db.session.add(user)
        try:
            db.session.commit()
            current_app.logger.info(f"User '{username}' created successfully.")
            return user, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating user '{username}': {e}")
            return None, "Database error during user creation."

    @staticmethod
    def get_user_by_id(user_id):
        """Retrieves a user by ID."""
        return User.query.get(user_id)

    @staticmethod
    def get_user_by_username(username):
        """Retrieves a user by username."""
        return User.query.filter_by(username=username).first()

    @staticmethod
    def get_all_users():
        """Retrieves all users."""
        return User.query.all()

    @staticmethod
    def update_user(user_id, data):
        """Updates an existing user's information."""
        user = User.query.get(user_id)
        if not user:
            return None, "User not found."

        if 'username' in data and data['username'] != user.username:
            if User.query.filter_by(username=data['username']).first():
                return None, "Username already exists."
            user.username = data['username']
        
        if 'email' in data and data['email'] != user.email:
            if User.query.filter_by(email=data['email']).first():
                return None, "Email already registered."
            user.email = data['email']

        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        if 'is_admin' in data:
            user.is_admin = data['is_admin']

        try:
            db.session.commit()
            current_app.logger.info(f"User '{user.username}' updated successfully.")
            return user, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating user '{user.username}': {e}")
            return None, "Database error during user update."

    @staticmethod
    def delete_user(user_id):
        """Deletes a user by ID."""
        user = User.query.get(user_id)
        if not user:
            return False, "User not found."
        
        db.session.delete(user)
        try:
            db.session.commit()
            current_app.logger.info(f"User '{user.username}' (ID: {user_id}) deleted successfully.")
            return True, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting user '{user.username}' (ID: {user_id}): {e}")
            return False, "Database error during user deletion."

```