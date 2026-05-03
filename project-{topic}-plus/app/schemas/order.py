```python
"""
Pydantic schemas for the Order and OrderItem entities.

This module defines the data structures for:
- Order status enumeration (`OrderStatus`).
- Creating individual order items (`OrderItemCreate`).
- Reading individual order items (`OrderItemRead`).
- Creating a new order (`OrderCreate`).
- Updating an existing order (`OrderUpdate`).
- Reading order details (`OrderRead`).
"""

import enum
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, NonNegativeInt, PositiveInt, PositiveFloat

class OrderStatus(enum.Enum):
    """
    Enum for different possible statuses of an order. Matches the ORM model's enum.
    """
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class OrderItemBase(BaseModel):
    """
    Base Pydantic schema for an order item.
    """
    product_id: PositiveInt = Field(..., example=1, description="ID of the product being ordered")
    quantity: PositiveInt = Field(..., example=2, description="Quantity of the product ordered (must be positive)")

class OrderItemCreate(OrderItemBase):
    """
    Pydantic schema for creating a new order item.
    Includes `price_at_purchase` which is crucial for historical accuracy.
    """
    price_at_purchase: PositiveFloat = Field(..., example=599.99, description="Price of the product at the time of order")

class OrderItemRead(OrderItemCreate):
    """
    Pydantic schema for reading (retrieving) order item details.
    Includes auto-generated fields like ID and timestamps.
    """
    id: int = Field(..., example=101, description="Unique ID of the order item")
    order_id: int = Field(..., example=1, description="ID of the order this item belongs to")
    created_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of item creation")
    updated_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of last update")

    class Config:
        """
        Pydantic configuration for ORM mode.
        Enables the Pydantic model to read data from ORM objects.
        """
        from_attributes = True

class OrderCreate(BaseModel):
    """
    Pydantic schema for creating a new order.
    Requires a list of `OrderItemBase` and optionally a shipping address.
    """
    items: List[OrderItemBase] = Field(..., min_length=1, description="List of items in the order")
    shipping_address: Optional[str] = Field(None, max_length=500, example="123 Main St, Anytown, USA", description="Shipping address for the order")

class OrderUpdate(BaseModel):
    """
    Pydantic schema for updating an existing order.
    Primarily used to update the status.
    """
    status: Optional[OrderStatus] = Field(None, example=OrderStatus.SHIPPED, description="New status for the order")
    shipping_address: Optional[str] = Field(None, max_length=500, example="456 Oak Ave, Otherville, USA", description="Updated shipping address")

class OrderRead(BaseModel):
    """
    Pydantic schema for reading (retrieving) order details.
    Includes auto-generated fields, total price, status, and related order items.
    """
    id: int = Field(..., example=1, description="Unique ID of the order")
    user_id: int = Field(..., example=1, description="ID of the user who placed the order")
    total_price: PositiveFloat = Field(..., example=1199.98, description="Total calculated price of the order")
    status: OrderStatus = Field(..., example=OrderStatus.PENDING, description="Current status of the order")
    shipping_address: Optional[str] = Field(None, example="123 Main St, Anytown, USA", description="Shipping address for the order")
    created_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of order creation")
    updated_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of last update")
    items: List[OrderItemRead] = Field([], description="List of items included in the order")

    class Config:
        """
        Pydantic configuration for ORM mode.
        Enables the Pydantic model to read data from ORM objects.
        """
        from_attributes = True

```