```python
from sqlalchemy import text
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Mapped, mapped_column, declarative_base
from datetime import datetime
import uuid

# Define a custom base class for all SQLAlchemy models
# This allows adding common columns like `id`, `created_at`, `updated_at` automatically.
class CustomBase:
    """
    Base class that provides common columns for all models:
    - id: UUID primary key.
    - created_at: Timestamp of record creation.
    - updated_at: Timestamp of last update.
    """
    # Use declared_attr to make `__tablename__` automatically derived from the class name
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s" # e.g., "users", "items", "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        unique=True,
        nullable=False,
        comment="Primary key, unique identifier for the record"
    )
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.now,
        nullable=False,
        comment="Timestamp when the record was created"
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.now,
        onupdate=datetime.now,
        nullable=False,
        comment="Timestamp when the record was last updated"
    )

# Create the declarative base
Base = declarative_base(cls=CustomBase)
```