```python
from pydantic import BaseModel
from datetime import datetime
from backend.app.schemas.user import User

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    chat_id: int
    owner_id: int # This will be set by the server from auth

class MessageUpdate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    chat_id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    owner: User # Nested user schema

    class Config:
        from_attributes = True
```