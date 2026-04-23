```python
from typing import Any
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy import Column, DateTime
from datetime import datetime, UTC

@as_declarative()
class Base:
    """Base class which provides automated table name
    and common columns for all models."""
    __name__: str

    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s" # pluralize table name

    id: Any
    __table_args__ = {'extend_existing': True} # Allows re-declaration in tests

    # Common fields for all models
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)

```