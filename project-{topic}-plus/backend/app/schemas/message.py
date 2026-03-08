```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.schemas.user import UserPublic # Import UserPublic for nested schema

# Base schema for common message attributes
class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

# Schema for creating a message
class MessageCreate(MessageBase):
    pass # No additional fields needed beyond content

# Schema for message data as stored in DB
class MessageInDB(MessageBase):
    id: int
    chat_room_id: int
    sender_id: int
    sent_at: datetime

    class Config:
        from_attributes = True

# Schema for public message data (includes sender details)
class MessagePublic(MessageInDB):
    sender: UserPublic # Nested schema for sender details

    class Config:
        from_attributes = True
```