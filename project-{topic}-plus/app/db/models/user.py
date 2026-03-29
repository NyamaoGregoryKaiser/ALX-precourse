```python
import uuid
from typing import List
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base # Import the CustomBase

class User(Base):
    """
    SQLAlchemy model for a User.
    Represents a user in the system with authentication and profile information.
    """
    __tablename__ = "users" # Explicit table name override is possible if desired

    # Basic user fields
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    # A user can have multiple items
    items: Mapped[List["Item"]] = relationship(
        "Item", back_populates="owner", cascade="all, delete-orphan", lazy="selectin"
    )
    # A user can have multiple orders
    orders: Mapped[List["Order"]] = relationship(
        "Order", back_populates="customer", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', full_name='{self.full_name}')>"

# Required for relationships, ensure all models are imported at some point
from app.db.models.item import Item
from app.db.models.order import Order
```