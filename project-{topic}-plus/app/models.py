from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
import enum

# In-memory set for revoked tokens (for demonstration).
# In production, this should be a persistent store like Redis or a database table.
REVOKED_TOKENS = set()

class Role(enum.Enum):
    ADMIN = "admin"
    USER = "user"

class User(db.Model):
    """
    Represents a user in the system.
    Users can have different roles (e.g., admin, regular user) and own tasks.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum(Role), default=Role.USER, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_tasks = db.relationship('Task', foreign_keys='Task.created_by_id', backref='creator', lazy='dynamic')
    assigned_tasks = db.relationship('Task', foreign_keys='Task.assigned_to_id', backref='assignee', lazy='dynamic')

    def set_password(self, password):
        """Hashes the given password and stores it."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Checks if the given password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def is_admin(self):
        """Checks if the user has an 'admin' role."""
        return self.role == Role.ADMIN

    def to_dict(self, include_email=False):
        """Converts user object to a dictionary."""
        data = {
            'id': self.id,
            'username': self.username,
            'role': self.role.value,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        if include_email:
            data['email'] = self.email
        return data

    def __repr__(self):
        return f'<User {self.username}>'

class TaskStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Task(db.Model):
    """
    Represents a task in the system.
    Tasks are created by users and can be assigned to other users.
    """
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    due_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Task can be unassigned

    def to_dict(self):
        """Converts task object to a dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status.value,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'created_by': self.created_by_id,
            'assigned_to': self.assigned_to_id,
        }

    def __repr__(self):
        return f'<Task {self.title}>'
```