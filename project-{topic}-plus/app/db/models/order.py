```python
import uuid
from typing import List
from datetime import datetime
from enum import Enum

from sqlalchemy import String, Float, ForeignKey, Enum as SQLEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base # Import the CustomBase

# Define an Enum for order status
class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(Base):
    """
    SQLAlchemy model for an Order.
    Represents a customer's order containing multiple items.
    """
    __tablename__ = "orders"

    # Order specific fields
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[OrderStatus] = mapped_column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    shipping_address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationship to User model
    customer: Mapped["User"] = relationship("User", back_populates="orders", lazy="selectin")

    # Relationship to OrderItem model (Many-to-Many with Item through OrderItem)
    order_items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, customer_id={self.customer_id}, status='{self.status}', total={self.total_amount})>"

class OrderItem(Base):
    """
    SQLAlchemy model for OrderItem.
    Represents a specific item within an order, acting as a link table
    between Order and Item, and storing item-specific order details.
    """
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), primary_key=True)
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price_at_purchase: Mapped[float] = mapped_column(Float, nullable=False) # Price at the time of purchase

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="order_items", lazy="selectin")
    item: Mapped["Item"] = relationship("Item", back_populates="order_items", lazy="selectin")

    def __repr__(self) -> str:
        return f"<OrderItem(order_id={self.order_id}, item_id={self.item_id}, quantity={self.quantity})>"

# Required for relationships
from app.db.models.user import User
from app.db.models.item import Item
```