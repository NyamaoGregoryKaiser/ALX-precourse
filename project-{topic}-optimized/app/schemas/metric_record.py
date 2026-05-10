from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class MetricRecordBase(BaseModel):
    service_id: int
    metric_type_id: int
    value: float = Field(..., description="The measured value of the metric.")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of the metric record.")


class MetricRecordCreate(MetricRecordBase):
    pass


class MetricRecordUpdate(MetricRecordBase):
    value: Optional[float] = None
    timestamp: Optional[datetime] = None


class MetricRecordInDBBase(MetricRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True


class MetricRecordRead(MetricRecordInDBBase):
    # Optional: include related data for easier frontend consumption
    service_name: Optional[str] = None
    metric_type_name: Optional[str] = None
    metric_type_unit: Optional[str] = None

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, 'service') and obj.service:
            obj.service_name = obj.service.name
        if hasattr(obj, 'metric_type') and obj.metric_type:
            obj.metric_type_name = obj.metric_type.name
            obj.metric_type_unit = obj.metric_type.unit
        return super().model_validate(obj, *args, **kwargs)

```

#### `app/schemas/alert_rule.py`
```python