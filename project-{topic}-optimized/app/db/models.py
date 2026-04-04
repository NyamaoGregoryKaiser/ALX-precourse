import datetime
from enum import Enum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.db.base import Base

class UserRole(str, Enum):
    """
    Enum for user roles.
    """
    ADMIN = "admin"
    USER = "user"

class OrderStatus(str, Enum):
    """
    Enum for order statuses.
    """
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class User(Base):
    """
    SQLAlchemy model for a User.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    items = relationship("Item", back_populates="owner")
    orders = relationship("Order", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

class Item(Base):
    """
    SQLAlchemy model for an Item/Product.
    """
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="items")
    order_items = relationship("OrderItem", back_populates="item")

    def __repr__(self):
        return f"<Item(id={self.id}, name='{self.name}', price='{self.price}')>"

class Order(Base):
    """
    SQLAlchemy model for an Order.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order(id={self.id}, user_id={self.user_id}, status='{self.status}')>"

class OrderItem(Base):
    """
    SQLAlchemy model for an item within an order.
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_order = Column(Float, nullable=False) # Store price at the time of order
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="order_items")
    item = relationship("Item", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem(id={self.id}, order_id={self.order_id}, item_id={self.item_id}, quantity={self.quantity})>"
```