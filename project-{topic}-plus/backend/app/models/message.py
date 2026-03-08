```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Message(Base):
    """
    Represents a single message sent in a chat room.
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    # Many-to-One: Message belongs to a chat room
    chat_room = relationship("ChatRoom", back_populates="messages")
    # Many-to-One: Message is sent by a user
    sender = relationship("User", back_populates="messages")

    def __repr__(self):
        return f"<Message(id={self.id}, room={self.chat_room_id}, sender={self.sender_id}, content='{self.content[:20]}...')>"

```