from datetime import datetime
import json
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app.database import db

# --- Enums ---
class DatabaseType(Enum):
    POSTGRESQL = 'postgresql'
    MYSQL = 'mysql'
    # Add other database types as needed

class TaskType(Enum):
    METRIC_COLLECTION = 'metric_collection'
    ANALYSIS = 'analysis'
    # Add other task types as needed

class TaskStatus(Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'

class MetricType(Enum):
    ACTIVE_QUERIES = 'active_queries'
    SLOW_QUERIES = 'slow_queries'
    INDEX_USAGE = 'index_usage'
    TABLE_STATS = 'table_stats'
    MISSING_INDEXES_CANDIDATES = 'missing_indexes_candidates'
    DB_CONFIG_PARAMS = 'db_config_params'
    # Add more metric types

class ReportType(Enum):
    PERFORMANCE_SUMMARY = 'performance_summary'
    INDEX_RECOMMENDATIONS = 'index_recommendations'
    QUERY_OPTIMIZATION = 'query_optimization'
    CONFIG_TWEAKS = 'config_tweaks'

# --- Models ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)

    monitored_databases = db.relationship('MonitoredDatabase', backref='owner', lazy=True)
    optimization_tasks = db.relationship('OptimizationTask', backref='creator', lazy=True)
    reports = db.relationship('Report', backref='author', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'is_admin': self.is_admin
        }

class MonitoredDatabase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    db_type = db.Column(db.Enum(DatabaseType), nullable=False) # e.g., 'postgresql', 'mysql'
    host = db.Column(db.String(100), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(100), nullable=False) # Store encrypted in production!
    database = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_monitored_at = db.Column(db.DateTime, nullable=True)

    metrics = db.relationship('Metric', backref='monitored_db', lazy=True)
    optimization_tasks = db.relationship('OptimizationTask', backref='target_db', lazy=True)
    reports = db.relationship('Report', backref='target_db', lazy=True)

    def __repr__(self):
        return f'<MonitoredDatabase {self.name} - {self.host}:{self.port}/{self.database}>'

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'db_type': self.db_type.value,
            'host': self.host,
            'port': self.port,
            'database': self.database,
            'created_at': self.created_at.isoformat(),
            'last_monitored_at': self.last_monitored_at.isoformat() if self.last_monitored_at else None
        }
        if include_sensitive:
            data['username'] = self.username
            data['password'] = self.password # In production, this would be encrypted
        return data

class Metric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    db_id = db.Column(db.Integer, db.ForeignKey('monitored_database.id'), nullable=False)
    metric_type = db.Column(db.Enum(MetricType), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    # Store JSON data for metrics (e.g., list of slow queries, index stats)
    data = db.Column(db.JSON, nullable=False)

    def __repr__(self):
        return f'<Metric {self.metric_type.value} for DB {self.db_id} at {self.timestamp}>'

    def to_dict(self):
        return {
            'id': self.id,
            'db_id': self.db_id,
            'metric_type': self.metric_type.value,
            'timestamp': self.timestamp.isoformat(),
            'data': self.data
        }

class OptimizationTask(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    db_id = db.Column(db.Integer, db.ForeignKey('monitored_database.id'), nullable=False)
    task_type = db.Column(db.Enum(TaskType), nullable=False) # e.g., 'metric_collection', 'analysis'
    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    schedule = db.Column(db.String(100), nullable=True) # e.g., "daily", "every 5 minutes", "cron: 0 0 * * *"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    last_run_at = db.Column(db.DateTime, nullable=True)
    celery_task_id = db.Column(db.String(50), nullable=True) # ID from Celery for tracking
    result_summary = db.Column(db.JSON, nullable=True) # Summary of task result

    reports_generated = db.relationship('Report', backref='source_task', lazy=True)

    def __repr__(self):
        return f'<OptimizationTask {self.task_type.value} for DB {self.db_id} - Status: {self.status.value}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'db_id': self.db_id,
            'task_type': self.task_type.value,
            'status': self.status.value,
            'schedule': self.schedule,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'last_run_at': self.last_run_at.isoformat() if self.last_run_at else None,
            'celery_task_id': self.celery_task_id,
            'result_summary': self.result_summary
        }

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    db_id = db.Column(db.Integer, db.ForeignKey('monitored_database.id'), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('optimization_task.id'), nullable=True) # Task that generated this report
    report_type = db.Column(db.Enum(ReportType), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    recommendations = db.Column(db.JSON, nullable=False) # List of recommended actions (e.g., SQL statements, config changes)
    raw_data = db.Column(db.JSON, nullable=True) # Raw data used for the report

    def __repr__(self):
        return f'<Report {self.title} for DB {self.db_id} at {self.generated_at}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'db_id': self.db_id,
            'task_id': self.task_id,
            'report_type': self.report_type.value,
            'generated_at': self.generated_at.isoformat(),
            'title': self.title,
            'summary': self.summary,
            'recommendations': self.recommendations,
            'raw_data': self.raw_data
        }
```