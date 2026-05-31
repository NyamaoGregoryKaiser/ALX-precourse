from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    data_sources = db.relationship('DataSource', backref='owner', lazy=True, cascade="all, delete-orphan")
    visualizations = db.relationship('Visualization', backref='creator', lazy=True, cascade="all, delete-orphan")
    dashboards = db.relationship('Dashboard', backref='creator', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class DataSource(db.Model):
    __tablename__ = 'data_sources'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(512), nullable=True)
    type = db.Column(db.String(50), nullable=False) # e.g., 'CSV', 'PostgreSQL', 'MySQL', 'API'
    connection_string = db.Column(db.Text, nullable=True) # For DBs or API URLs
    file_path = db.Column(db.String(256), nullable=True) # For CSV, Excel files
    schema_json = db.Column(db.JSON, nullable=True) # Stores detected schema/metadata

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    visualizations = db.relationship('Visualization', backref='data_source', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<DataSource {self.name} ({self.type})>'

class Visualization(db.Model):
    __tablename__ = 'visualizations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(512), nullable=True)
    type = db.Column(db.String(50), nullable=False) # e.g., 'bar', 'line', 'pie', 'table'
    config_json = db.Column(db.JSON, nullable=False, default={}) # Stores visualization configuration (e.g., axes, colors)
    query_json = db.Column(db.JSON, nullable=True) # Stores query/transformation rules for data source

    data_source_id = db.Column(db.Integer, db.ForeignKey('data_sources.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dashboard_associations = db.relationship(
        'DashboardVisualization',
        back_populates='visualization',
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f'<Visualization {self.name} ({self.type})>'

class Dashboard(db.Model):
    __tablename__ = 'dashboards'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(512), nullable=True)
    layout_json = db.Column(db.JSON, nullable=True, default={}) # Stores overall dashboard layout (grid, etc.)

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    visualization_associations = db.relationship(
        'DashboardVisualization',
        back_populates='dashboard',
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f'<Dashboard {self.name}>'

class DashboardVisualization(db.Model):
    __tablename__ = 'dashboard_visualizations'
    dashboard_id = db.Column(db.Integer, db.ForeignKey('dashboards.id'), primary_key=True)
    visualization_id = db.Column(db.Integer, db.ForeignKey('visualizations.id'), primary_key=True)
    position_x = db.Column(db.Integer, nullable=False, default=0)
    position_y = db.Column(db.Integer, nullable=False, default=0)
    width = db.Column(db.Integer, nullable=False, default=6) # e.g., grid units
    height = db.Column(db.Integer, nullable=False, default=4) # e.g., grid units

    dashboard = db.relationship('Dashboard', back_populates='visualization_associations')
    visualization = db.relationship('Visualization', back_populates='dashboard_associations')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<DashboardViz Dashboard:{self.dashboard_id} Viz:{self.visualization_id}>'