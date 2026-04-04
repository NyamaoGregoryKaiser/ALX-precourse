from datetime import datetime
from typing import List, Literal
from pydantic import BaseModel, Field, conint, confloat

from app.db.models import OrderStatus
from app.schemas.item import ItemResponse # Assuming you have an ItemResponse schema

class OrderItemBase(BaseModel):
    """
    Base Pydantic model for an item within an order.
    """
    item_id: int = Field(..., description="ID of the item being ordered")
    quantity: conint(ge=1) = Field(..., description="Quantity of the item, must be at least 1")

class OrderItemCreate(OrderItemBase):
    """
    Pydantic model for creating an order item.
    """
    pass

class OrderItemInDBBase(OrderItemBase):
    """
    Pydantic model for an order item as stored in the DB.
    Includes DB-generated fields and `price_at_order`.
    """
    id: int = Field(..., description="Unique ID of the order item")
    order_id: int = Field(..., description="ID of the parent order")
    price_at_order: confloat(gt=0) = Field(..., description="Price of the item at the time of order")
    created_at: datetime = Field(..., description="Timestamp of order item creation")
    updated_at: datetime = Field(..., description="Timestamp of last order item update")

    class Config:
        from_attributes = True

class OrderItemResponse(OrderItemInDBBase):
    """
    Pydantic model for order item response, suitable for API output.
    Can include nested item details.
    """
    item: ItemResponse | None = None # Include full item details if requested by client

class OrderBase(BaseModel):
    """
    Base Pydantic model for an Order.
    """
    # total_amount and status are typically derived/managed by the backend
    # user_id is derived from auth token
    pass

class OrderCreate(OrderBase):
    """
    Pydantic model for creating a new Order.
    Requires a list of items to be ordered.
    """
    items: List[OrderItemCreate] = Field(..., description="List of items to include in the order")

class OrderUpdate(OrderBase):
    """
    Pydantic model for updating an existing Order.
    Mainly for status updates by admins or specific cases.
    """
    status: OrderStatus | None = Field(None, description="New status of the order")
    # For now, items within an order are not directly updated through this endpoint after creation.
    # A new order would typically be created for changes.

class OrderInDBBase(OrderBase):
    """
    Pydantic model for an Order as stored in the DB.
    Includes DB-generated fields.
    """
    id: int = Field(..., description="Unique ID of the order")
    user_id: int = Field(..., description="ID of the user who placed the order")
    total_amount: confloat(gt=0) = Field(..., description="Total amount of the order")
    status: OrderStatus = Field(..., description="Current status of the order")
    created_at: datetime = Field(..., description="Timestamp of order creation")
    updated_at: datetime = Field(..., description="Timestamp of last order update")

    class Config:
        from_attributes = True

class OrderResponse(OrderInDBBase):
    """
    Pydantic model for Order response, suitable for API output.
    Includes nested order items.
    """
    order_items: List[OrderItemResponse] = Field([], description="List of items included in the order")
    # user: UserPublic # Optionally include user details

```