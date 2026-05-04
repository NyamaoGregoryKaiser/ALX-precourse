```python
# app/models/target_db_model.py
from app.core.db import db
from app.models.base_model import Base

class TargetDatabase(Base):
    __tablename__ = 'target_databases'
    name = db.Column(db.String(120), nullable=False)
    db_type = db.Column(db.String(50), nullable=False) # e.g., 'postgresql', 'mysql'
    connection_string = db.Column(db.String(255), nullable=False) # e.g., 'postgresql://user:pass@host:port/dbname'
    is_active = db.Column(db.Boolean, default=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    owner = db.relationship('User', backref=db.backref('target_databases', lazy=True))
    metrics = db.relationship('PerformanceMetric', backref='target_db', lazy=True, cascade="all, delete-orphan")
    suggestions = db.relationship('OptimizationSuggestion', backref='target_db', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'db_type': self.db_type,
            'connection_string': self.connection_string, # WARNING: In production, do not expose raw connection string. Encrypt or only show parts.
            'is_active': self.is_active,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<TargetDatabase {self.name} ({self.db_type})>'
```