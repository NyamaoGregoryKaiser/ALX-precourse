from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class MetricTypeBase(BaseModel):
    name: str
    unit: Optional[str] = None


class MetricTypeCreate(MetricTypeBase):
    pass


class MetricTypeUpdate(MetricTypeBase):
    name: Optional[str] = None
    unit: Optional[str] = None


class MetricTypeInDBBase(MetricTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True


class MetricTypeRead(MetricTypeInDBBase):
    pass

```

#### `app/schemas/metric_record.py`
```python