import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.schemas.user import User
from enum import Enum as PyEnum

class ProjectStatus(PyEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Project(Base):
    """
    SQLAlchemy model for a project.
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.NOT_STARTED, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="owned_projects", lazy="joined")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan", lazy="noload")

    def __repr__(self):
        return f"<Project(id={self.id}, title='{self.title}', status='{self.status}')>"
```