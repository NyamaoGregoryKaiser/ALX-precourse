```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

# Base schema for common user attributes
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: bool = True

# Schema for user creation (includes password)
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

# Schema for updating user data (all fields optional)
class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

# Schema for user data as stored in DB (includes hashed_password)
class UserInDB(UserBase):
    id: int
    hashed_password: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Enable ORM mode for Pydantic v2

# Schema for public user data (excludes sensitive info like hashed_password)
class UserPublic(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True # Enable ORM mode for Pydantic v2
```