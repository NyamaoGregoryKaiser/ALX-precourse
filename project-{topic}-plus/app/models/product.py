```python
"""
SQLAlchemy ORM model for the Product entity.

This module defines the database schema for products, including fields for
product details, pricing, stock, and status. It integrates with the `BaseORM`
for common fields.
"""

from sqlalchemy import Column, Integer, String, Text, Float, Boolean
from sqlalchemy.orm import relationship

from app.models.base import BaseORM # Import BaseORM from core.database

class Product(BaseORM):
    """
    SQLAlchemy model representing a product in the ALX-Shop system.

    Attributes:
        id (int): Primary key, auto-incrementing. Inherited from BaseORM.
        name (str): The name of the product.
        description (str): A detailed description of the product.
        price (float): The current price of the product.
        stock (int): The current quantity of the product available in stock.
        is_active (bool): Whether the product is available for sale.
        created_at (datetime): Timestamp of record creation. Inherited from BaseORM.
        updated_at (datetime): Timestamp of last record update. Inherited from BaseORM.

        order_items (relationship): One-to-many relationship with OrderItem model.
    """
    __tablename__ = "products"

    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float(precision=2), nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    order_items = relationship("OrderItem", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        """
        Returns a string representation of the Product object.
        """
        return (
            f"<Product(id={self.id}, name='{self.name}', price={self.price}, "
            f"stock={self.stock}, is_active={self.is_active})>"
        )

```