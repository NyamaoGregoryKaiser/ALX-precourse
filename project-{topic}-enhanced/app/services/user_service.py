from app import db
from app.models.user import User
from app.models.cart import Cart
from app.utils.errors import NotFoundError, ConflictError, BadRequestError
import logging

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    def get_all_users():
        return User.query.all()

    @staticmethod
    def get_user_by_id(user_id):
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError(f"User with id {user_id} not found.")
        return user

    @staticmethod
    def create_user(username, email, password, role='customer'):
        if User.query.filter_by(username=username).first():
            raise ConflictError("Username already exists.")
        if User.query.filter_by(email=email).first():
            raise ConflictError("Email already registered.")

        try:
            new_user = User(username=username, email=email, password=password, role=role)
            db.session.add(new_user)
            db.session.flush() # To get the new_user.id for cart creation
            
            # Create a cart for the new user
            new_cart = Cart(user_id=new_user.id)
            db.session.add(new_cart)
            
            db.session.commit()
            logger.info(f"User {new_user.username} and their cart created successfully.")
            return new_user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user {username}: {e}")
            raise BadRequestError(f"Failed to create user: {e}")

    @staticmethod
    def update_user(user_id, data):
        user = UserService.get_user_by_id(user_id)
        
        if 'username' in data and data['username'] != user.username and User.query.filter_by(username=data['username']).first():
            raise ConflictError("Username already taken.")
        if 'email' in data and data['email'] != user.email and User.query.filter_by(email=data['email']).first():
            raise ConflictError("Email already registered.")

        try:
            user.username = data.get('username', user.username)
            user.email = data.get('email', user.email)
            if 'password' in data:
                user.password_hash = user.set_password(data['password'])
            user.role = data.get('role', user.role)
            user.is_active = data.get('is_active', user.is_active)
            db.session.commit()
            logger.info(f"User {user_id} updated successfully.")
            return user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user {user_id}: {e}")
            raise BadRequestError(f"Failed to update user: {e}")

    @staticmethod
    def delete_user(user_id):
        user = UserService.get_user_by_id(user_id)
        try:
            db.session.delete(user)
            db.session.commit()
            logger.info(f"User {user_id} deleted successfully.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting user {user_id}: {e}")
            raise BadRequestError(f"Failed to delete user: {e}")