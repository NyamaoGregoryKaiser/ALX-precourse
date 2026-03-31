```python
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False) # For group chats, or a generated name for DMs
    is_group = Column(Boolean, default=True) # True for group chats, False for direct messages
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    members = relationship("ChatMember", back_populates="chat", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Chat(id={self.id}, name='{self.name}', is_group={self.is_group})>"

class ChatMember(Base):
    __tablename__ = "chat_members"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    chat = relationship("Chat", back_populates="members")
    user = relationship("User", back_populates="chat_memberships")

    def __repr__(self):
        return f"<ChatMember(chat_id={self.chat_id}, user_id={self.user_id})>"
```