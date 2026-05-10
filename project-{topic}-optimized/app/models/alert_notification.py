from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base


class AlertNotification(Base):
    __tablename__ = "alert_notifications"

    alert_rule_id = Column(Integer, ForeignKey("alert_rules.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False, index=True) # Redundant but denormalized for faster queries
    metric_type_id = Column(Integer, ForeignKey("metric_types.id"), nullable=False, index=True) # Redundant but denormalized for faster queries
    triggered_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    current_value = Column(String, nullable=False) # Store the value that triggered the alert
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    alert_rule = relationship("AlertRule", back_populates="alert_notifications")
    service = relationship("Service", back_populates="alert_notifications")
    # metric_type = relationship("MetricType") # Can join via alert_rule or service for this

    def __repr__(self):
        return f"<AlertNotification(id={self.id}, rule_id={self.alert_rule_id}, triggered_at='{self.triggered_at}', resolved={self.is_resolved})>"

```

#### `app/schemas/user.py`
```python