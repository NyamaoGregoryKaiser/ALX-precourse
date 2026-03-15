from datetime import datetime
from app import db, bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='customer') # 'customer', 'admin'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cart = db.relationship('Cart', backref='user', uselist=False, lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='user', lazy=True, cascade='all, delete-orphan')

    def __init__(self, username, email, password, role='customer'):
        self.username = username
        self.email = email
        self.password_hash = self.set_password(password)
        self.role = role

    def set_password(self, password):
        return bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def generate_tokens(self):
        access_token = create_access_token(identity={'id': self.id, 'role': self.role})
        refresh_token = create_refresh_token(identity={'id': self.id, 'role': self.role})
        return {'access_token': access_token, 'refresh_token': refresh_token}

    def __repr__(self):
        return f"<User {self.username}>"