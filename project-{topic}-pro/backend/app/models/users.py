```python
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    TEAM_LEAD = "team_lead"
    MEMBER = "member"

class User(TimestampMixin, Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(UserRole), default=UserRole.MEMBER, nullable=False)

    # Relationships
    teams_owned = relationship("Team", back_populates="owner", foreign_keys="[Team.owner_id]")
    memberships = relationship("TeamMember", back_populates="user")
    projects_created = relationship("Project", back_populates="creator")
    tasks_assigned = relationship("Task", back_populates="assignee")
    comments = relationship("Comment", back_populates="author")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}')>"

```