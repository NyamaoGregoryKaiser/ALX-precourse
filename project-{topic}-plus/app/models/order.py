```python
"""
SQLAlchemy ORM models for the Order and OrderItem entities.

This module defines the database schemas for orders and the individual items
within an order. It includes fields for order status, pricing, and relationships
to users and products. It integrates with `BaseORM` for common fields.
"""

import enum
from sqlalchemy import Column, Integer, String, Text, Float, Enum, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.base import BaseORM # Import BaseORM from core.database

class OrderStatus(enum.Enum):
    """
    Enum for different possible statuses of an order.
    """
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class Order(BaseORM):
    """
    SQLAlchemy model representing a customer order in the ALX-Shop system.

    Attributes:
        id (int): Primary key, auto-incrementing. Inherited from BaseORM.
        user_id (int): Foreign key to the User who placed the order.
        total_price (float): The total price of the order at the time of purchase.
        status (OrderStatus): The current status of the order.
        shipping_address (str): The shipping address for the order.
        created_at (datetime): Timestamp of record creation. Inherited from BaseORM.
        updated_at (datetime): Timestamp of last record update. Inherited from BaseORM.

        user (relationship): Many-to-one relationship with User model.
        items (relationship): One-to-many relationship with OrderItem model.
    """
    __tablename__ = "orders"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    total_price = Column(Float(precision=2), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    shipping_address = Column(Text, nullable=True) # Optional for simplicity, could be a separate table

    # Relationships
    user = relationship("User", back_populates="orders", lazy="selectin")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        """
        Returns a string representation of the Order object.
        """
        return (
            f"<Order(id={self.id}, user_id={self.user_id}, total_price={self.total_price}, "
            f"status='{self.status.value}')>"
        )


class OrderItem(BaseORM):
    """
    SQLAlchemy model representing a single item within an order.

    Attributes:
        id (int): Primary key, auto-incrementing. Inherited from BaseORM.
        order_id (int): Foreign key to the Order this item belongs to.
        product_id (int): Foreign key to the Product being ordered.
        quantity (int): The quantity of the product ordered.
        price_at_purchase (float): The price of the product at the time of order creation.
        created_at (datetime): Timestamp of record creation. Inherited from BaseORM.
        updated_at (datetime): Timestamp of last record update. Inherited from BaseORM.

        order (relationship): Many-to-one relationship with Order model.
        product (relationship): Many-to-one relationship with Product model.
    """
    __tablename__ = "order_items"

    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Float(precision=2), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items", lazy="selectin")
    product = relationship("Product", back_populates="order_items", lazy="selectin")

    def __repr__(self):
        """
        Returns a string representation of the OrderItem object.
        """
        return (
            f"<OrderItem(id={self.id}, order_id={self.order_id}, product_id={self.product_id}, "
            f"quantity={self.quantity}, price_at_purchase={self.price_at_purchase})>"
        )

```