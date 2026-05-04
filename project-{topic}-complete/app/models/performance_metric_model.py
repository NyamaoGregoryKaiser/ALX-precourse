```python
# app/models/performance_metric_model.py
from app.core.db import db
from app.models.base_model import Base

class PerformanceMetric(Base):
    __tablename__ = 'performance_metrics'
    target_db_id = db.Column(db.Integer, db.ForeignKey('target_databases.id'), nullable=False)
    metric_type = db.Column(db.String(100), nullable=False) # e.g., 'slow_query', 'cpu_utilization', 'disk_io'
    metric_value = db.Column(db.Text, nullable=False) # JSON or string representation of the metric data
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now())
    is_anomaly = db.Column(db.Boolean, default=False)
    analyzed = db.Column(db.Boolean, default=False) # Indicates if this metric has been analyzed for suggestions

    def to_dict(self):
        return {
            'id': self.id,
            'target_db_id': self.target_db_id,
            'metric_type': self.metric_type,
            'metric_value': self.metric_value,
            'timestamp': self.timestamp.isoformat(),
            'is_anomaly': self.is_anomaly,
            'analyzed': self.analyzed,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<PerformanceMetric {self.metric_type} for DB {self.target_db_id} at {self.timestamp}>'
```