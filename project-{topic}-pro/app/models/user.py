from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.database import Base

"""
SQLAlchemy model definition for the User entity.
This model represents the 'users' table in the database.
"""

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Define a relationship to the Task model.
    # `back_populates="owner"` creates a bidirectional relationship.
    # `lazy="joined"` means tasks will be loaded eagerly with the user when queried.
    tasks = relationship("Task", back_populates="owner", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"

    # Method to check if user is active (could also be a property)
    def is_active_user(self) -> bool:
        return self.is_active

    # Method to check if user is an admin
    def is_admin_user(self) -> bool:
        return self.is_admin
```

```