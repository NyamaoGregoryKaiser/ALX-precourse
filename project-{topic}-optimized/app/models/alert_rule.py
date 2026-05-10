from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    service_id = Column(Integer, ForeignKey("services.id"), nullable=False, index=True)
    metric_type_id = Column(Integer, ForeignKey("metric_types.id"), nullable=False, index=True)
    condition = Column(String, nullable=False) # e.g., "value > 80.0", "value < 20.0"
    threshold_value = Column(String) # Store as string for flexibility, actual parsing happens in evaluator
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    service = relationship("Service", back_populates="alert_rules")
    metric_type = relationship("MetricType", back_populates="alert_rules")
    alert_notifications = relationship("AlertNotification", back_populates="alert_rule", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AlertRule(id={self.id}, service_id={self.service_id}, metric_type_id={self.metric_type_id}, condition='{self.condition}')>"

```

#### `app/models/alert_notification.py`
```python