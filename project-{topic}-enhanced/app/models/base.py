```python
import datetime
from sqlalchemy import Column, DateTime, func
from app.core.database import Base
import uuid

class UUIDMixin:
    """Mixin for UUID primary key."""
    id = Column(
        'id',
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )

class TimestampMixin:
    """Mixin for created_at and updated_at columns."""
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
```