```python
from app.extensions import db, bcrypt
from app.models import User
from app.schemas import user_schema, users_schema
from flask import current_app
from sqlalchemy.exc import IntegrityError

class UserService:
    @staticmethod
    def get_all_users(page=1, per_page=10):
        """Fetches all users with pagination."""
        paginated_users = User.query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return {
            "users": users_schema.dump(paginated_users.items),
            "total_pages": paginated_users.pages,
            "current_page": paginated_users.page,
            "total_items": paginated_users.total
        }, 200

    @staticmethod
    def get_user_by_id(user_id):
        """Fetches a single user by ID."""
        user = User.query.get(user_id)
        if not user:
            current_app.logger.warning(f"User with ID {user_id} not found.")
            return {"message": "User not found"}, 404
        return user_schema.dump(user), 200

    @staticmethod
    def update_user(user_id, data, current_user_id, current_user_role):
        """Updates an existing user's information."""
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404

        # Authorization: Admins can update any user. Non-admins can only update their own profile.
        if not (current_user_role == 'admin' or str(user.id) == current_user_id):
            return {"message": "You are not authorized to update this user."}, 403

        try:
            # Prevent non-admins from changing their own role or other critical fields
            if current_user_role != 'admin':
                if 'role' in data:
                    return {"message": "Only administrators can change user roles."}, 403
                # Add other sensitive fields here if needed
                # e.g., if 'is_active' in data: return ...

            # Handle password change separately if provided
            if 'password' in data and data['password']:
                user.password = data['password'] # Setter will hash it
                del data['password'] # Remove from data to prevent schema trying to load it

            # Load and update the user data
            updated_user = user_schema.load(data, instance=user, partial=True, session=db.session)

            db.session.commit()
            current_app.logger.info(f"User '{user.username}' (ID: {user_id}) updated successfully by user {current_user_id}.")
            return user_schema.dump(updated_user), 200
        except IntegrityError:
            db.session.rollback()
            current_app.logger.error(f"Integrity error updating user {user_id}. Possibly duplicate username/email.")
            return {"message": "A user with this username or email already exists."}, 409
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating user {user_id} for user {current_user_id}: {e}")
            return {"message": "Could not update user due to an internal server error."}, 500

    @staticmethod
    def delete_user(user_id, current_user_id, current_user_role):
        """Deletes a user."""
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404

        # Authorization: Only admins can delete users.
        if current_user_role != 'admin':
            return {"message": "Only administrators can delete users."}, 403
        
        # Prevent admin from deleting themselves
        if str(user.id) == current_user_id:
            return {"message": "An administrator cannot delete their own account."}, 403

        try:
            db.session.delete(user)
            db.session.commit()
            current_app.logger.info(f"User '{user.username}' (ID: {user_id}) deleted successfully by admin {current_user_id}.")
            return {"message": "User deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting user {user_id} by admin {current_user_id}: {e}")
            return {"message": "Could not delete user due to an internal server error."}, 500
```