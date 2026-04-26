```python
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.orm import declarative_base

# Base class for all models to inherit from
Base = declarative_base()

class TimestampMixin:
    """
    Mixin for adding created_at and updated_at timestamps to models.
    """
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

```