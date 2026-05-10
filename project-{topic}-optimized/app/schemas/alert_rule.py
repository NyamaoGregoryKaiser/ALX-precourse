from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AlertRuleBase(BaseModel):
    service_id: int
    metric_type_id: int
    condition: str = Field(..., description="The condition that triggers the alert (e.g., 'value > 80.0'). 'value' is the metric record value.")
    threshold_value: Optional[str] = Field(None, description="The threshold value(s) in the condition, extracted for easier display/management if possible.")
    description: Optional[str] = None
    is_active: bool = True


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(AlertRuleBase):
    service_id: Optional[int] = None
    metric_type_id: Optional[int] = None
    condition: Optional[str] = None


class AlertRuleInDBBase(AlertRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True


class AlertRuleRead(AlertRuleInDBBase):
    service_name: Optional[str] = None
    metric_type_name: Optional[str] = None

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, 'service') and obj.service:
            obj.service_name = obj.service.name
        if hasattr(obj, 'metric_type') and obj.metric_type:
            obj.metric_type_name = obj.metric_type.name
        return super().model_validate(obj, *args, **kwargs)

```

#### `app/schemas/alert_notification.py`
```python