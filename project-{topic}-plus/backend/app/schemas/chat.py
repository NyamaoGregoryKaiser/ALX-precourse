```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from backend.app.schemas.user import User

class ChatBase(BaseModel):
    name: str
    is_group: bool = True

class ChatCreate(ChatBase):
    member_ids: List[int] # IDs of users to include in the chat

class ChatUpdate(ChatBase):
    name: Optional[str] = None
    is_group: Optional[bool] = None

class ChatMemberBase(BaseModel):
    user_id: int
    chat_id: int

class ChatMember(ChatMemberBase):
    id: int
    joined_at: datetime
    user: User # Nested user schema

    class Config:
        from_attributes = True

class Chat(ChatBase):
    id: int
    created_at: datetime
    updated_at: datetime
    members: List[ChatMember] = []

    class Config:
        from_attributes = True
```