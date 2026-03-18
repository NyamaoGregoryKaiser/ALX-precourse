```python
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base schema for user, used for common fields."""
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(min_length=8)


class UserUpdate(UserBase):
    """Schema for updating an existing user."""
    password: str | None = Field(None, min_length=8)
    is_active: bool | None = None
    is_superuser: bool | None = None


class UserInDBBase(UserBase):
    """Base schema for user as stored in DB, including ID and timestamps."""
    id: uuid.UUID
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode


class User(UserInDBBase):
    """Public schema for user, excluding sensitive fields like hashed_password."""
    pass


class UserPublic(UserInDBBase):
    """Even more public schema, perhaps for displaying to other users."""
    pass


class UserInDB(UserInDBBase):
    """Schema for user with hashed password, used internally."""
    hashed_password: str
```