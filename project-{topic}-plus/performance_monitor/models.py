```python
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from performance_monitor.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    services = db.relationship('Service', backref='owner', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<User {self.username}>'

class Service(db.Model):
    __tablename__ = 'services'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    base_url = db.Column(db.String(255), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    endpoints = db.relationship('Endpoint', backref='service', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'base_url': self.base_url,
            'owner_id': self.owner_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Service {self.name}>'

class Endpoint(db.Model):
    __tablename__ = 'endpoints'
    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    path = db.Column(db.String(255), nullable=False) # e.g., /api/users, /health
    method = db.Column(db.String(10), default='GET', nullable=False) # GET, POST, PUT, DELETE
    expected_status = db.Column(db.Integer, default=200)
    polling_interval_seconds = db.Column(db.Integer, default=60) # How often to poll this specific endpoint
    last_polled_at = db.Column(db.DateTime)
    last_status = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    metrics = db.relationship('Metric', backref='endpoint', lazy='dynamic', cascade="all, delete-orphan")

    __table_args__ = (db.UniqueConstraint('service_id', 'path', 'method', name='_service_path_method_uc'),)
    db.Index('idx_endpoint_service_id', service_id) # Index for faster lookup by service

    def get_full_url(self):
        return f"{self.service.base_url.rstrip('/')}/{self.path.lstrip('/')}" if self.path else self.service.base_url

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'path': self.path,
            'method': self.method,
            'expected_status': self.expected_status,
            'polling_interval_seconds': self.polling_interval_seconds,
            'last_polled_at': self.last_polled_at.isoformat() if self.last_polled_at else None,
            'last_status': self.last_status,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Endpoint {self.method} {self.path} for Service {self.service_id}>'

class Metric(db.Model):
    __tablename__ = 'metrics'
    id = db.Column(db.Integer, primary_key=True)
    endpoint_id = db.Column(db.Integer, db.ForeignKey('endpoints.id'), nullable=False)
    response_time_ms = db.Column(db.Integer, nullable=False) # Response time in milliseconds
    status_code = db.Column(db.Integer, nullable=False)
    response_size_bytes = db.Column(db.Integer) # Size of the response body
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_healthy = db.Column(db.Boolean, nullable=False) # True if status_code matches expected_status
    error_message = db.Column(db.Text) # Any error message if polling failed or status was unexpected

    db.Index('idx_metric_endpoint_id_timestamp', endpoint_id, timestamp.desc()) # Composite index for time-series queries
    db.Index('idx_metric_timestamp', timestamp.desc()) # Index for overall recent metrics

    def to_dict(self):
        return {
            'id': self.id,
            'endpoint_id': self.endpoint_id,
            'response_time_ms': self.response_time_ms,
            'status_code': self.status_code,
            'response_size_bytes': self.response_size_bytes,
            'timestamp': self.timestamp.isoformat(),
            'is_healthy': self.is_healthy,
            'error_message': self.error_message
        }

    def __repr__(self):
        return f'<Metric Endpoint:{self.endpoint_id} Status:{self.status_code} Time:{self.response_time_ms}ms>'

```