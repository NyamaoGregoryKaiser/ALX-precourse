```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserPublic # Import UserPublic for nested schema

# Base schema for common chat room attributes
class ChatRoomBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_ -]+$")
    description: Optional[str] = Field(None, max_length=500)
    is_private: bool = False

# Schema for creating a chat room
class ChatRoomCreate(ChatRoomBase):
    pass

# Schema for updating a chat room (all fields optional)
class ChatRoomUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=50, pattern="^[a-zA-Z0-9_ -]+$")
    description: Optional[str] = Field(None, max_length=500)
    is_private: Optional[bool] = None

# Schema for chat room data as stored in DB
class ChatRoomInDB(ChatRoomBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Schema for public chat room data (includes owner details)
class ChatRoomPublic(ChatRoomInDB):
    owner: UserPublic # Nested schema for owner details
    members: List[UserPublic] = [] # List of members

    class Config:
        from_attributes = True
```