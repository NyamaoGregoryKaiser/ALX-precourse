from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class AlertNotificationBase(BaseModel):
    alert_rule_id: int
    service_id: int
    metric_type_id: int
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    current_value: str = Field(..., description="The metric value that triggered the alert.")
    message: str
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None


class AlertNotificationCreate(AlertNotificationBase):
    pass


class AlertNotificationUpdate(BaseModel):
    is_resolved: Optional[bool] = None
    resolved_at: Optional[datetime] = None


class AlertNotificationInDBBase(AlertNotificationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True


class AlertNotificationRead(AlertNotificationInDBBase):
    alert_rule_condition: Optional[str] = None
    service_name: Optional[str] = None
    metric_type_name: Optional[str] = None

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, 'alert_rule') and obj.alert_rule:
            obj.alert_rule_condition = obj.alert_rule.condition
        if hasattr(obj, 'service') and obj.service:
            obj.service_name = obj.service.name
        if hasattr(obj, 'alert_rule') and hasattr(obj.alert_rule, 'metric_type') and obj.alert_rule.metric_type:
            obj.metric_type_name = obj.alert_rule.metric_type.name
        elif hasattr(obj, 'metric_type') and obj.metric_type: # Fallback if metric_type relation directly loaded
             obj.metric_type_name = obj.metric_type.name
        return super().model_validate(obj, *args, **kwargs)
```

#### `app/schemas/token.py`, `app/schemas/msg.py`
```python