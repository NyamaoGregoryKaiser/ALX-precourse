import logging
from app import db
from app.models import User, Role
from app.utils.exceptions import NotFoundError, ConflictError, UnauthorizedError, ForbiddenError

logger = logging.getLogger(__name__)

class UserService:
    """
    Service layer for managing user-related business logic.
    Handles CRUD operations for users and role management.
    """

    @staticmethod
    def get_user_by_id(user_id):
        """
        Retrieves a user by their ID.
        Args:
            user_id (int): The ID of the user.
        Returns:
            User: The user object.
        Raises:
            NotFoundError: If the user does not exist.
        """
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User with ID {user_id} not found.")
            raise NotFoundError("User not found.")
        logger.debug(f"Retrieved user: {user.username} (ID: {user.id})")
        return user

    @staticmethod
    def get_all_users():
        """
        Retrieves all users in the system.
        Returns:
            list[User]: A list of all user objects.
        """
        users = User.query.all()
        logger.debug(f"Retrieved {len(users)} users.")
        return users

    @staticmethod
    def update_user(user_id, current_user_id, current_user_role, data):
        """
        Updates an existing user's details.
        Args:
            user_id (int): The ID of the user to update.
            current_user_id (int): The ID of the user performing the update.
            current_user_role (Role): The role of the user performing the update.
            data (dict): Dictionary containing fields to update (username, email, role).
        Returns:
            User: The updated user object.
        Raises:
            NotFoundError: If the user does not exist.
            ForbiddenError: If current user tries to update another user's role or updates another user without admin rights.
            ConflictError: If username or email already exists for another user.
        """
        user = UserService.get_user_by_id(user_id)

        # Authorization check:
        # 1. Non-admin users can only update their own profile.
        # 2. Admins can update any profile.
        # 3. Non-admin users cannot change their own role.
        # 4. Admins can change any role, but cannot demote themselves.

        if current_user_id != user.id and current_user_role != Role.ADMIN:
            logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to update user {user_id} without admin privileges.")
            raise ForbiddenError("You are not authorized to update other users' profiles.")

        # Handle username update
        if 'username' in data and data['username'] != user.username:
            if User.query.filter_by(username=data['username']).first():
                logger.warning(f"Update failed for user {user_id}: Username '{data['username']}' already taken.")
                raise ConflictError("Username already exists.")
            user.username = data['username']

        # Handle email update
        if 'email' in data and data['email'] != user.email:
            if User.query.filter_by(email=data['email']).first():
                logger.warning(f"Update failed for user {user_id}: Email '{data['email']}' already taken.")
                raise ConflictError("Email already exists.")
            user.email = data['email']

        # Handle role update (only for admins)
        if 'role' in data:
            new_role = data['role']
            if current_user_role != Role.ADMIN:
                logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to change role without admin privileges.")
                raise ForbiddenError("Only administrators can change user roles.")
            
            # Admin cannot demote themselves
            if current_user_id == user.id and new_role != Role.ADMIN:
                logger.warning(f"Admin user {current_user_id} attempted to demote self to {new_role.value}.")
                raise ForbiddenError("Administrators cannot demote themselves.")
            
            user.role = new_role
            logger.info(f"User {user.id} role changed to {new_role.value} by Admin {current_user_id}.")

        db.session.commit()
        logger.info(f"User {user.id} updated successfully by {current_user_id}.")
        return user

    @staticmethod
    def delete_user(user_id, current_user_id, current_user_role):
        """
        Deletes a user from the system.
        Args:
            user_id (int): The ID of the user to delete.
            current_user_id (int): The ID of the user performing the deletion.
            current_user_role (Role): The role of the user performing the deletion.
        Raises:
            NotFoundError: If the user does not exist.
            ForbiddenError: If the user tries to delete themselves or deletes another user without admin rights.
        """
        user = UserService.get_user_by_id(user_id)

        # Authorization check:
        # 1. Only admins can delete users.
        # 2. Admins cannot delete themselves.
        if current_user_role != Role.ADMIN:
            logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to delete user {user_id} without admin privileges.")
            raise ForbiddenError("Only administrators can delete users.")
        
        if current_user_id == user.id:
            logger.warning(f"Admin user {current_user_id} attempted to delete self.")
            raise ForbiddenError("Administrators cannot delete themselves.")

        db.session.delete(user)
        db.session.commit()
        logger.info(f"User {user_id} deleted successfully by Admin {current_user_id}.")
```