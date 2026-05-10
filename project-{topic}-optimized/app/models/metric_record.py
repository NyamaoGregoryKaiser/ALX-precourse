from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base


class MetricRecord(Base):
    __tablename__ = "metric_records"

    service_id = Column(Integer, ForeignKey("services.id"), nullable=False, index=True)
    metric_type_id = Column(Integer, ForeignKey("metric_types.id"), nullable=False, index=True)
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    service = relationship("Service", back_populates="metric_records")
    metric_type = relationship("MetricType", back_populates="metric_records")

    def __repr__(self):
        return f"<MetricRecord(id={self.id}, service_id={self.service_id}, metric_type_id={self.metric_type_id}, value={self.value}, timestamp='{self.timestamp}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "service_id": self.service_id,
            "metric_type_id": self.metric_type_id,
            "metric_type_name": self.metric_type.name if self.metric_type else None,
            "metric_type_unit": self.metric_type.unit if self.metric_type else None,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

```

#### `app/models/alert_rule.py`
```python