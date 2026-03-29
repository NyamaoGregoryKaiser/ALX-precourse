```python
import uuid
from typing import List
from datetime import datetime

from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base # Import the CustomBase

class Item(Base):
    """
    SQLAlchemy model for an Item.
    Represents a product or service available in the system.
    """
    __tablename__ = "items"

    # Item specific fields
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Foreign key for owner (User)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Relationship to User model
    owner: Mapped["User"] = relationship("User", back_populates="items", lazy="selectin")

    # Relationship to Order models (through OrderItem link table)
    order_items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="item", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Item(id={self.id}, name='{self.name}', price={self.price}, owner_id={self.owner_id})>"

# Required for relationships
from app.db.models.user import User
from app.db.models.order import OrderItem
```