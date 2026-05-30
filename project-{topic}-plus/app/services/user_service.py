```python
from app.extensions import db
from app.models.user import User, UserRole
from app.schemas.user import user_register_schema, user_update_schema, user_schema
from app.utils.errors import NotFoundError, ConflictError, BadRequestError
from sqlalchemy.exc import IntegrityError
import logging

class UserService:
    """
    Service layer for User-related business logic.
    Handles CRUD operations and user-specific actions like password changes.
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_all_users(self):
        """Retrieves all users."""
        self.logger.info("Fetching all users.")
        users = User.query.all()
        return users_schema.dump(users)

    def get_user_by_id(self, user_id):
        """Retrieves a single user by ID."""
        self.logger.info(f"Fetching user with ID: {user_id}")
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found.")
        return user_schema.dump(user)

    def get_user_by_username(self, username):
        """Retrieves a single user by username."""
        self.logger.info(f"Fetching user with username: {username}")
        user = User.query.filter_by(username=username).first()
        if not user:
            raise NotFoundError(f"User with username '{username}' not found.")
        return user

    def create_user(self, user_data):
        """
        Creates a new user.
        Validates input and handles password hashing.
        """
        self.logger.info(f"Attempting to create user with data: {user_data.get('username')}")
        
        # Validate input using Marshmallow schema
        errors = user_register_schema.validate(user_data)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        # Check for existing username or email before attempting to add
        if User.query.filter_by(username=user_data['username']).first():
            raise ConflictError(f"Username '{user_data['username']}' already exists.")
        if User.query.filter_by(email=user_data['email']).first():
            raise ConflictError(f"Email '{user_data['email']}' already exists.")

        try:
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password'], # Password will be hashed by model's constructor
                role=UserRole(user_data.get('role', UserRole.USER.value)) # Default to USER
            )
            db.session.add(user)
            db.session.commit()
            self.logger.info(f"User '{user.username}' created successfully with ID: {user.id}")
            return user_schema.dump(user)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error creating user: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A user with this username or email already exists.")
            raise

    def update_user(self, user_id, update_data):
        """
        Updates an existing user's information.
        Handles password changes if 'new_password' is provided.
        """
        self.logger.info(f"Attempting to update user ID: {user_id} with data: {update_data}")
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found.")

        # Validate input using Marshmallow schema for updates
        errors = user_update_schema.validate(update_data, partial=True)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        try:
            # Handle unique constraints for username and email
            if 'username' in update_data and update_data['username'] != user.username:
                if User.query.filter_by(username=update_data['username']).first():
                    raise ConflictError(f"Username '{update_data['username']}' already exists.")
                user.username = update_data['username']
            
            if 'email' in update_data and update_data['email'] != user.email:
                if User.query.filter_by(email=update_data['email']).first():
                    raise ConflictError(f"Email '{update_data['email']}' already exists.")
                user.email = update_data['email']

            if 'role' in update_data:
                user.role = UserRole(update_data['role'])
            
            if 'is_active' in update_data:
                user.is_active = update_data['is_active']
            
            # Handle password change
            if 'new_password' in update_data and update_data['new_password']:
                user.set_password(update_data['new_password'])

            db.session.commit()
            self.logger.info(f"User ID: {user.id} updated successfully.")
            return user_schema.dump(user)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error updating user ID {user_id}: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A user with this username or email already exists.")
            raise

    def delete_user(self, user_id):
        """Deletes a user by ID."""
        self.logger.info(f"Attempting to delete user ID: {user_id}")
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found.")
        
        db.session.delete(user)
        db.session.commit()
        self.logger.info(f"User ID: {user.id} deleted successfully.")
        return {"message": f"User with ID {user_id} deleted successfully."}

```