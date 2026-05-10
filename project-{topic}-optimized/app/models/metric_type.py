from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class MetricType(Base):
    __tablename__ = "metric_types"

    name = Column(String, unique=True, index=True, nullable=False) # e.g., "CPU_USAGE", "MEMORY_USAGE", "LATENCY", "ERROR_RATE"
    unit = Column(String) # e.g., "%", "MB", "ms", "count/s"

    # Relationships
    metric_records = relationship("MetricRecord", back_populates="metric_type", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="metric_type", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MetricType(id={self.id}, name='{self.name}', unit='{self.unit}')>"

```

#### `app/models/metric_record.py`
```python