from datetime import datetime
from pydantic import BaseModel, Field, conint, confloat

class ItemBase(BaseModel):
    """
    Base Pydantic model for Item data.
    Used for common fields across creation and update.
    """
    name: str = Field(..., min_length=3, max_length=100, description="Name of the item")
    description: str | None = Field(None, max_length=500, description="Description of the item")
    price: confloat(gt=0) = Field(..., description="Price of the item, must be greater than 0")
    stock_quantity: conint(ge=0) = Field(0, description="Current stock quantity, must be non-negative")
    is_active: bool = Field(True, description="Whether the item is active and available for purchase")

class ItemCreate(ItemBase):
    """
    Pydantic model for creating a new Item.
    Inherits from ItemBase.
    """
    # owner_id will be derived from the authenticated user, so it's not in the request body
    pass

class ItemUpdate(ItemBase):
    """
    Pydantic model for updating an existing Item.
    All fields are optional for partial updates.
    """
    name: str | None = Field(None, min_length=3, max_length=100, description="Name of the item")
    description: str | None = Field(None, max_length=500, description="Description of the item")
    price: confloat(gt=0) | None = Field(None, description="Price of the item, must be greater than 0")
    stock_quantity: conint(ge=0) | None = Field(None, description="Current stock quantity, must be non-negative")
    is_active: bool | None = Field(None, description="Whether the item is active and available for purchase")

class ItemInDBBase(ItemBase):
    """
    Base Pydantic model for Item data as stored in the DB, including DB-generated fields.
    """
    id: int = Field(..., description="Unique ID of the item")
    owner_id: int = Field(..., description="ID of the user who owns/created the item")
    created_at: datetime = Field(..., description="Timestamp of item creation")
    updated_at: datetime = Field(..., description="Timestamp of last item update")

    class Config:
        from_attributes = True # Enable ORM mode for Pydantic v2

class ItemResponse(ItemInDBBase):
    """
    Pydantic model for Item response, suitable for API output.
    Can include relationships if needed (e.g., owner_details: UserPublic).
    """
    # owner: Optional[UserPublic] = None # Example of including relationship if desired
    pass
```