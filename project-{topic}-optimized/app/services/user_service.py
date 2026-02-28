from app.database import db
from app.models.user import User, UserRole
from app.utils.errors import NotFoundError, BadRequestError, ConflictError, ForbiddenError
from flask import current_app
from sqlalchemy.exc import IntegrityError

class UserService:
    """
    Handles business logic related to user management.
    """

    @staticmethod
    def get_user_by_id(user_id):
        """Fetches a user by their ID."""
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found.")
        return user

    @staticmethod
    def get_all_users(page=1, per_page=10, search=None):
        """Fetches all users with pagination and optional search."""
        query = User.query.order_by(User.created_at.desc())
        if search:
            query = query.filter(
                (User.username.ilike(f'%{search}%')) |
                (User.email.ilike(f'%{search}%'))
            )
        users_pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return users_pagination.items, users_pagination.total

    @staticmethod
    def update_user(user_id, data, current_user_id, current_user_roles):
        """Updates an existing user's information."""
        user = UserService.get_user_by_id(user_id)

        # Authorization check: A user can only update their own profile unless they are an admin
        if user_id != current_user_id and 'ADMIN' not in current_user_roles:
            raise ForbiddenError("You are not authorized to update this user's profile.")

        # Prevent non-admins from changing roles or email
        if 'ADMIN' not in current_user_roles:
            if 'roles' in data:
                raise ForbiddenError("You cannot modify user roles.")
            if 'email' in data and data['email'] != user.email:
                raise ForbiddenError("You cannot modify your email address directly. Contact support.")
            if 'is_active' in data:
                raise ForbiddenError("You cannot change account activation status.")

        # Update fields
        if 'username' in data:
            if User.query.filter(User.username == data['username'], User.id != user_id).first():
                raise ConflictError("Username already taken.")
            user.username = data['username']

        if 'email' in data and 'ADMIN' in current_user_roles: # Admin can change email
            if User.query.filter(User.email == data['email'], User.id != user_id).first():
                raise ConflictError("Email already registered.")
            user.email = data['email']

        if 'password' in data:
            user.set_password(data['password'])

        if 'is_active' in data and 'ADMIN' in current_user_roles:
            user.is_active = data['is_active']

        if 'roles' in data and 'ADMIN' in current_user_roles:
            user.roles = [] # Clear existing roles
            for role_name in data['roles']:
                role = UserRole.query.filter_by(name=role_name).first()
                if not role:
                    raise BadRequestError(f"Role '{role_name}' does not exist.")
                user.roles.append(role)

        try:
            db.session.commit()
            current_app.logger.info(f"User {user_id} updated by {current_user_id}.")
            return user
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("A user with this username or email already exists.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating user {user_id}: {e}")
            raise InternalServerError("Could not update user.")


    @staticmethod
    def delete_user(user_id, current_user_id, current_user_roles):
        """Deletes a user."""
        user = UserService.get_user_by_id(user_id)

        # Authorization check: Only admins can delete users, and an admin cannot delete themselves
        if 'ADMIN' not in current_user_roles:
            raise ForbiddenError("You are not authorized to delete users.")
        if user_id == current_user_id:
            raise BadRequestError("You cannot delete your own account.")

        try:
            db.session.delete(user)
            db.session.commit()
            current_app.logger.info(f"User {user_id} deleted by {current_user_id}.")
            return {"message": "User deleted successfully."}
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting user {user_id}: {e}")
            raise InternalServerError("Could not delete user.")