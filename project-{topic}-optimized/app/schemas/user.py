from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False


class UserCreate(UserBase):
    email: EmailStr
    password: str


class UserUpdate(UserBase):
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: int

    class ConfigDict:
        from_attributes = True


class UserRead(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: str

```

#### `app/schemas/service.py`
```python