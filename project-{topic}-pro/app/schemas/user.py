from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

"""
Pydantic schemas for User data validation, request, and response models.
These define the data structures for API interactions.
"""

class UserBase(BaseModel):
    """Base schema for user, including common fields."""
    email: EmailStr = Field(..., example="john.doe@example.com", description="User's email address")

class UserCreate(UserBase):
    """Schema for creating a new user (registration)."""
    password: str = Field(..., min_length=8, max_length=50, example="securepassword123", description="User's password")

class UserUpdate(BaseModel):
    """Schema for updating an existing user's profile."""
    email: Optional[EmailStr] = Field(None, example="john.doe.new@example.com", description="New email address for the user")
    is_active: Optional[bool] = Field(None, example=True, description="Whether the user account is active")
    is_admin: Optional[bool] = Field(None, example=False, description="Whether the user has admin privileges")

class UserInDB(UserBase):
    """Schema for user data as stored in the database (internal use, includes sensitive info like hashed password)."""
    id: int
    hashed_password: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Allows Pydantic to read ORM objects

class UserResponse(UserBase):
    """Schema for user data returned in API responses (excludes sensitive info)."""
    id: int = Field(..., example=1, description="Unique identifier for the user")
    is_active: bool = Field(True, example=True, description="Whether the user account is active")
    is_admin: bool = Field(False, example=False, description="Whether the user has admin privileges")
    created_at: datetime = Field(..., example="2023-10-27T10:00:00.000000", description="Timestamp of user creation")
    updated_at: datetime = Field(..., example="2023-10-27T10:00:00.000000", description="Timestamp of last update")

    class Config:
        from_attributes = True # Allows Pydantic to read ORM objects
```

```