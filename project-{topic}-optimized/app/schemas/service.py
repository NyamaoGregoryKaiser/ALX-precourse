from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(ServiceBase):
    name: Optional[str] = None


class ServiceInDBBase(ServiceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True


class ServiceRead(ServiceInDBBase):
    pass

# For displaying services with their latest metrics
class MetricRecordLatest(BaseModel):
    metric_type_name: str
    metric_type_unit: Optional[str] = None
    value: float
    timestamp: datetime


class ServiceWithLatestMetrics(ServiceInDBBase):
    latest_metrics: List[dict] = [] # Use dict as MetricRecord.to_dict() returns dict

```

#### `app/schemas/metric_type.py`
```python