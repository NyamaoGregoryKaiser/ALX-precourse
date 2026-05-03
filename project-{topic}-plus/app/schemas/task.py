import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.schemas.project import Project
from app.schemas.user import User
from enum import Enum as PyEnum

class TaskStatus(PyEnum):
    TO_DO = "to_do"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"

class Task(Base):
    """
    SQLAlchemy model for a task.
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.TO_DO, nullable=False)
    priority = Column(Integer, default=1, nullable=False) # 1 highest, 5 lowest
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Optional assignee
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="tasks", lazy="joined")
    assignee = relationship("User", back_populates="assigned_tasks", lazy="joined")

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status}')>"
```