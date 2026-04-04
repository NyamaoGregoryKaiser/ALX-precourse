from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, constr

from app.db.models import UserRole

# Regular expressions for validation
PHONE_NUMBER_REGEX = r"^\+?\d{10,15}$" # Allows optional '+' and 10-15 digits

class UserBase(BaseModel):
    """
    Base Pydantic model for User data.
    Used for common fields across creation and update.
    """
    email: EmailStr = Field(..., description="User's unique email address")
    full_name: Optional[str] = Field(None, min_length=2, max_length=100, description="User's full name")
    phone_number: Optional[constr(pattern=PHONE_NUMBER_REGEX)] = Field(None, description="User's phone number")
    is_active: bool = Field(True, description="Whether the user account is active")
    is_verified: bool = Field(False, description="Whether the user's email/phone is verified")
    role: UserRole = Field(UserRole.USER, description="User's role (admin, user)")

class UserCreate(UserBase):
    """
    Pydantic model for creating a new User.
    Requires a password.
    """
    password: str = Field(..., min_length=8, description="User's password")

class UserRegister(BaseModel):
    """
    Pydantic model for user registration.
    A simplified version of UserCreate for public registration.
    """
    email: EmailStr = Field(..., description="User's unique email address")
    password: str = Field(..., min_length=8, description="User's password")
    full_name: Optional[str] = Field(None, min_length=2, max_length=100, description="User's full name")
    phone_number: Optional[constr(pattern=PHONE_NUMBER_REGEX)] = Field(None, description="User's phone number")

class UserUpdate(UserBase):
    """
    Pydantic model for updating an existing User.
    All fields are optional for partial updates.
    """
    email: Optional[EmailStr] = Field(None, description="User's unique email address")
    full_name: Optional[str] = Field(None, min_length=2, max_length=100, description="User's full name")
    phone_number: Optional[constr(pattern=PHONE_NUMBER_REGEX)] = Field(None, description="User's phone number")
    is_active: Optional[bool] = Field(None, description="Whether the user account is active")
    is_verified: Optional[bool] = Field(None, description="Whether the user's email/phone is verified")
    role: Optional[UserRole] = Field(None, description="User's role (admin, user)")
    password: Optional[str] = Field(None, min_length=8, description="User's new password (if changing)")


class UserInDBBase(UserBase):
    """
    Base Pydantic model for User data as stored in the DB, including DB-generated fields.
    Does NOT include password hash.
    """
    id: int = Field(..., description="Unique ID of the user")
    created_at: datetime = Field(..., description="Timestamp of user creation")
    updated_at: datetime = Field(..., description="Timestamp of last user update")

    class Config:
        from_attributes = True # Enable ORM mode for Pydantic v2

class UserResponse(UserInDBBase):
    """
    Pydantic model for User response, suitable for API output.
    Does not expose sensitive information like password hash.
    """
    pass

class UserPublic(UserInDBBase):
    """
    Pydantic model for public user data, for use in nested responses
    where only essential user info is needed.
    """
    # Exclude sensitive fields if inherited from UserInDBBase
    # For example, if UserInDBBase had 'is_active' but you don't want to expose it
    # You could redefine fields or use model_dump(exclude={...})
    # For now, UserInDBBase is already pretty public-safe.
    pass
```