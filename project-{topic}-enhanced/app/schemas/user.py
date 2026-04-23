```python
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False

# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters long")

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = Field(None, min_length=8, description="Password must be at least 8 characters long")

# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    id: int
    email: EmailStr
    is_active: bool
    is_superuser: bool

    class ConfigDict:
        from_attributes = True # Allow model to be created from ORM attributes

# Properties to return via API
class User(UserInDBBase):
    pass

# Properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str
```