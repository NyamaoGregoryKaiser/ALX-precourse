```python
"""
Pydantic schemas for the Product entity.

This module defines the data structures for:
- Creating a new product (`ProductCreate`).
- Reading product details (`ProductRead`).
- Updating product details (`ProductUpdate`).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, PositiveFloat, NonNegativeInt

class ProductBase(BaseModel):
    """
    Base Pydantic schema for product, containing common attributes.
    """
    name: str = Field(..., min_length=3, max_length=100, example="Smartphone X", description="Name of the product")
    description: Optional[str] = Field(None, max_length=1000, example="Latest model smartphone with advanced features.", description="Detailed description of the product")
    price: PositiveFloat = Field(..., example=599.99, description="Price of the product (must be positive)")
    stock: NonNegativeInt = Field(..., example=100, description="Current stock quantity (cannot be negative)")
    is_active: bool = Field(True, example=True, description="Whether the product is active and available for sale")

class ProductCreate(ProductBase):
    """
    Pydantic schema for creating a new product.
    All fields are required.
    """
    pass # Inherits all fields and validations from ProductBase

class ProductUpdate(BaseModel):
    """
    Pydantic schema for updating an existing product.
    All fields are optional, allowing partial updates.
    """
    name: Optional[str] = Field(None, min_length=3, max_length=100, example="Smartphone X Pro", description="Updated name of the product")
    description: Optional[str] = Field(None, max_length=1000, example="Upgraded model with better camera and battery.", description="Updated detailed description")
    price: Optional[PositiveFloat] = Field(None, example=649.99, description="Updated price of the product")
    stock: Optional[NonNegativeInt] = Field(None, example=95, description="Updated stock quantity")
    is_active: Optional[bool] = Field(None, example=False, description="Updated active status of the product")

class ProductRead(ProductBase):
    """
    Pydantic schema for reading (retrieving) product details.
    Includes auto-generated fields like ID and timestamps.
    """
    id: int = Field(..., example=1, description="Unique ID of the product")
    created_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of product creation")
    updated_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of last update")

    class Config:
        """
        Pydantic configuration for ORM mode.
        Enables the Pydantic model to read data from ORM objects.
        """
        from_attributes = True

```