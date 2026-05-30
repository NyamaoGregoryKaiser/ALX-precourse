```python
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from enum import Enum

class UserRole(Enum):
    ADMIN = 'admin'
    EDITOR = 'editor'
    USER = 'user'

    def __str__(self):
        return self.value

class User(db.Model):
    """
    Represents a user in the CMS.
    Users can have different roles (admin, editor, user).
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now, nullable=False)

    # Relationships
    posts = db.relationship('Post', backref='author', lazy=True)
    media_items = db.relationship('Media', backref='uploader', lazy=True)

    def __init__(self, username, email, password, role=UserRole.USER):
        self.username = username
        self.email = email
        self.set_password(password)
        self.role = role

    def set_password(self, password):
        """Hashes the password and stores it."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Checks if the provided password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def is_admin(self):
        return self.role == UserRole.ADMIN

    def is_editor(self):
        return self.role == UserRole.EDITOR or self.is_admin()

    def has_role(self, required_roles):
        """
        Checks if the user has any of the required roles.
        `required_roles` can be a single UserRole enum or a list/tuple of them.
        """
        if not isinstance(required_roles, (list, tuple)):
            required_roles = [required_roles]

        for required_role in required_roles:
            if required_role == UserRole.ADMIN and self.is_admin():
                return True
            if required_role == UserRole.EDITOR and self.is_editor():
                return True
            if required_role == UserRole.USER and self.role == UserRole.USER:
                return True
        return False

    def __repr__(self):
        return f'<User {self.username}>'

```