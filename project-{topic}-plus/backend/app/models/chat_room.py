```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base
from app.models.user import UserRoomAssociation # Import association model

class ChatRoom(Base):
    """
    Represents a chat room in the application.
    """
    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    is_private = Column(Boolean, default=False, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    # Many-to-One: ChatRoom has one owner
    owner = relationship("User", back_populates="created_chat_rooms")
    # One-to-Many: ChatRoom can have many messages
    messages = relationship("Message", back_populates="chat_room", cascade="all, delete-orphan")
    # Many-to-Many via association table
    member_associations = relationship("UserRoomAssociation", back_populates="room", cascade="all, delete-orphan")
    # Direct access to members of the room
    members = relationship("User", secondary="user_room_association", back_populates="chat_rooms")

    def __repr__(self):
        return f"<ChatRoom(id={self.id}, name='{self.name}', owner_id={self.owner_id})>"

```