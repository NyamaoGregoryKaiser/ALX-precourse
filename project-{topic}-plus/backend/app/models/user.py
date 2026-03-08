```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class UserRoomAssociation(Base):
    """
    Association table for User and ChatRoom (Many-to-Many relationship).
    Allows storing additional attributes like join_date.
    """
    __tablename__ = "user_room_association"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), primary_key=True)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="room_associations")
    room = relationship("ChatRoom", back_populates="member_associations")

class User(Base):
    """
    Represents a user in the chat application.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    # One-to-Many: User can create many chat rooms
    created_chat_rooms = relationship("ChatRoom", back_populates="owner")
    # One-to-Many: User can send many messages
    messages = relationship("Message", back_populates="sender")
    # Many-to-Many via association table
    room_associations = relationship("UserRoomAssociation", back_populates="user")
    # Direct access to rooms a user is a member of
    chat_rooms = relationship("ChatRoom", secondary="user_room_association", back_populates="members")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"

```