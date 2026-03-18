```python
import datetime
import uuid
from typing import Any

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy.sql import func


@as_declarative()
class Base:
    """
    Base class which provides automated table name
    and common columns like id, created_at, updated_at.
    """

    @declared_attr
    def __tablename__(cls) -> str:
        """
        Generate __tablename__ automatically from class name in plural snake_case.
        E.g., "User" -> "users", "DataSource" -> "data_sources"
        """
        name = cls.__name__
        return (
            "".join(
                [f"_{c.lower()}" if c.isupper() else c for c in name]
            )
            .strip("_")
            .lower()
            + "s"
        )

    id: Any
    __name__: str


class BaseMixin:
    """
    Mixin for common columns like ID, creation and update timestamps.
    """

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```