```python
"""
Pydantic schemas for the User entity.

This module defines the data structures for:
- Creating a new user (`UserCreate`).
- Reading user details (`UserRead`).
- Updating user details (`UserUpdate`).
- Defining user roles (`UserRole`).
"""

import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

class UserRole(enum.Enum):
    """
    Enum for different user roles. Matches the ORM model's enum.
    """
    CUSTOMER = "customer"
    ADMIN = "admin"

class UserBase(BaseModel):
    """
    Base Pydantic schema for user, containing common attributes.
    """
    email: EmailStr = Field(..., example="user@example.com", description="Unique email address of the user")
    full_name: Optional[str] = Field(None, example="John Doe", description="Full name of the user")

class UserCreate(UserBase):
    """
    Pydantic schema for creating a new user.
    Includes password, which is not returned in read operations.
    """
    password: str = Field(..., min_length=8, max_length=50, example="securepassword123", description="User's password")
    role: UserRole = Field(UserRole.CUSTOMER, example=UserRole.CUSTOMER, description="Role of the user (e.g., customer, admin)")
    is_active: bool = Field(True, example=True, description="Whether the user account is active")


class UserUpdate(UserBase):
    """
    Pydantic schema for updating an existing user.
    All fields are optional, allowing partial updates.
    """
    email: Optional[EmailStr] = Field(None, example="new_user@example.com", description="Updated unique email address")
    full_name: Optional[str] = Field(None, example="Jane Smith", description="Updated full name of the user")
    password: Optional[str] = Field(None, min_length=8, max_length=50, example="newsecurepassword456", description="Updated password (hashed before storage)")
    is_active: Optional[bool] = Field(None, example=False, description="Updated active status of the user account")
    role: Optional[UserRole] = Field(None, example=UserRole.ADMIN, description="Updated role of the user")

class UserRead(UserBase):
    """
    Pydantic schema for reading (retrieving) user details.
    Excludes sensitive information like hashed password.
    """
    id: int = Field(..., example=1, description="Unique ID of the user")
    is_active: bool = Field(..., example=True, description="Whether the user account is active")
    role: UserRole = Field(..., example=UserRole.CUSTOMER, description="Role of the user")
    created_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of user creation")
    updated_at: datetime = Field(..., example="2023-01-01T12:00:00.000000", description="Timestamp of last update")

    class Config:
        """
        Pydantic configuration for ORM mode.
        Enables the Pydantic model to read data from ORM objects.
        """
        from_attributes = True

```