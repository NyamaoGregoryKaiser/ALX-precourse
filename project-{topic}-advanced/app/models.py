import uuid
from datetime import datetime
from app.extensions import db, bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token
from flask import current_app

class User(db.Model):
    """
    User model representing a user in the system.
    Includes password hashing and role-based access.
    """
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    role = db.Column(db.String(20), default='user', nullable=False) # 'user', 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __init__(self, username, email, password, role='user'):
        self.username = username
        self.email = email
        self.set_password(password)
        self.role = role

    def set_password(self, password):
        """Hashes the password using Bcrypt."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Checks if the provided password matches the hashed password."""
        return bcrypt.check_password_hash(self.password_hash, password)

    def generate_tokens(self, fresh=False):
        """Generates access and refresh JWT tokens for the user."""
        access_token = create_access_token(identity=self.id, fresh=fresh,
                                           additional_claims={"roles": [self.role]})
        refresh_token = create_refresh_token(identity=self.id)
        return {"access_token": access_token, "refresh_token": refresh_token}

    def __repr__(self):
        return f'<User {self.username}>'

class TokenBlacklist(db.Model):
    """
    Model to store revoked JWT tokens.
    Uses Redis for actual blacklisting but this model provides a fallback
    or can be used for persistent blacklisting across restarts.
    """
    __tablename__ = 'token_blacklist'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, unique=True) # JWT ID
    token_type = db.Column(db.String(10), nullable=False) # 'access' or 'refresh'
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    revoked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

    user = db.relationship('User', backref=db.backref('revoked_tokens', lazy=True))

    def __init__(self, jti, token_type, user_id, expires_at):
        self.jti = jti
        self.token_type = token_type
        self.user_id = user_id
        self.expires_at = expires_at

    def __repr__(self):
        return f'<TokenBlacklist {self.jti}>'