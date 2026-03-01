```python
import slugify
from sqlalchemy.exc import IntegrityError
from app import db, bcrypt
from app.models import User, UserRole, Cart
from app.schemas import UserSchema
from flask import current_app

class UserService:
    user_schema = UserSchema()
    users_schema = UserSchema(many=True)

    @classmethod
    def create_user(cls, username, email, password, role=UserRole.CUSTOMER):
        """Creates a new user and an associated cart."""
        try:
            if User.query.filter_by(email=email).first():
                raise ValueError("A user with this email already exists.")
            if User.query.filter_by(username=username).first():
                raise ValueError("A user with this username already exists.")

            user = User(username=username, email=email, role=role)
            user.password = password  # Uses the password setter to hash
            db.session.add(user)
            db.session.flush() # Flush to get user.id before committing

            # Create an empty cart for the new user
            cart = Cart(user_id=user.id)
            db.session.add(cart)

            db.session.commit()
            return cls.user_schema.dump(user)
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Database error occurred while creating user. Check unique constraints.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating user: {e}")
            raise

    @classmethod
    def get_user_by_id(cls, user_id):
        """Retrieves a user by ID."""
        user = User.query.get(user_id)
        if not user:
            return None
        return cls.user_schema.dump(user)

    @classmethod
    def get_user_by_email(cls, email):
        """Retrieves a user by email."""
        user = User.query.filter_by(email=email).first()
        if not user:
            return None
        return cls.user_schema.dump(user)

    @classmethod
    def get_user_by_username(cls, username):
        """Retrieves a user by username."""
        user = User.query.filter_by(username=username).first()
        if not user:
            return None
        return cls.user_schema.dump(user)

    @classmethod
    def verify_user(cls, email, password):
        """Verifies user credentials."""
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            return cls.user_schema.dump(user)
        return None

    @classmethod
    def update_user_profile(cls, user_id, data):
        """Updates a user's profile information."""
        user = User.query.get(user_id)
        if not user:
            return None

        # Prevent updating email or role without specific permissions/flows
        if 'email' in data and data['email'] != user.email:
            if User.query.filter(User.email == data['email'], User.id != user_id).first():
                raise ValueError("Email already in use.")
            user.email = data['email']
        if 'username' in data and data['username'] != user.username:
            if User.query.filter(User.username == data['username'], User.id != user_id).first():
                raise ValueError("Username already in use.")
            user.username = data['username']
        if 'password' in data:
            user.password = data['password'] # Uses the setter to hash

        db.session.commit()
        return cls.user_schema.dump(user)

    @classmethod
    def delete_user(cls, user_id):
        """Deletes a user and their associated data."""
        user = User.query.get(user_id)
        if not user:
            return False
        
        # Cascade delete handled by ORM relationships (cart, orders)
        db.session.delete(user)
        db.session.commit()
        return True
```