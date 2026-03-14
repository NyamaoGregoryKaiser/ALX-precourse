```python
from datetime import datetime
from app.extensions import db, bcrypt
from app.utils.decorators import log_model_operation

@log_model_operation
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='user', nullable=False) # 'admin', 'manager', 'user'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    tasks_assigned = db.relationship('Task', foreign_keys='Task.assigned_to_id', backref='assignee', lazy=True)
    tasks_created = db.relationship('Task', foreign_keys='Task.creator_id', backref='creator', lazy=True)
    projects_managed = db.relationship('Project', foreign_keys='Project.manager_id', backref='manager', lazy=True)
    comments = db.relationship('Comment', backref='author', lazy=True)

    def __init__(self, username, email, password, role='user'):
        self.username = username
        self.email = email
        self.set_password(password)
        self.role = role

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self, include_email=False, include_role=False):
        data = {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'is_active': self.is_active
        }
        if include_email:
            data['email'] = self.email
        if include_role:
            data['role'] = self.role
        return data

    @staticmethod
    def from_dict(data, partial=False):
        user = User(
            username=data.get('username'),
            email=data.get('email'),
            password=data.get('password'),
            role=data.get('role', 'user')
        )
        if partial:
            # For updates, we don't need all fields
            if 'password' in data:
                user.set_password(data['password'])
        return user

    def __repr__(self):
        return f'<User {self.username}>'

```