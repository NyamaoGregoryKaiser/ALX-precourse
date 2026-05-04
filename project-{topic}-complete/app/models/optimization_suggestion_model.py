```python
# app/models/optimization_suggestion_model.py
from app.core.db import db
from app.models.base_model import Base

class OptimizationSuggestion(Base):
    __tablename__ = 'optimization_suggestions'
    target_db_id = db.Column(db.Integer, db.ForeignKey('target_databases.id'), nullable=False)
    metric_id = db.Column(db.Integer, db.ForeignKey('performance_metrics.id'), nullable=True) # Link to specific metric
    suggestion_type = db.Column(db.String(100), nullable=False) # e.g., 'index_creation', 'query_rewrite', 'schema_change'
    description = db.Column(db.Text, nullable=False)
    sql_statement = db.Column(db.Text, nullable=True) # SQL to execute for the suggestion
    priority = db.Column(db.String(50), default='medium') # e.g., 'low', 'medium', 'high', 'critical'
    status = db.Column(db.String(50), default='pending') # e.g., 'pending', 'applied', 'ignored', 'resolved'
    suggested_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # If manually added

    metric = db.relationship('PerformanceMetric', backref=db.backref('suggestions', lazy=True))
    suggested_by = db.relationship('User', backref=db.backref('generated_suggestions', lazy=True))


    def to_dict(self):
        return {
            'id': self.id,
            'target_db_id': self.target_db_id,
            'metric_id': self.metric_id,
            'suggestion_type': self.suggestion_type,
            'description': self.description,
            'sql_statement': self.sql_statement,
            'priority': self.priority,
            'status': self.status,
            'suggested_by_user_id': self.suggested_by_user_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<OptimizationSuggestion {self.suggestion_type} for DB {self.target_db_id}>'
```