from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import datetime
from app.schemas.user import UserRole

# Shared properties
class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = True
    role: Optional[UserRole] = UserRole.MEMBER

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=6)

# Properties to receive via API on update
class UserUpdate(UserBase):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[UserRole] = None

# Properties stored in DB
class UserInDBBase(UserBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# Properties to return to API
class User(UserInDBBase):
    pass

# For response that doesn't include sensitive info like email (e.g., assignee)
class UserPublic(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    role: UserRole

    class Config:
        from_attributes = True
```