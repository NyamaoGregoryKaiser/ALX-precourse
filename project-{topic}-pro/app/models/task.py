import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship

from app.database import Base

"""
SQLAlchemy model definition for the Task entity.
This model represents the 'tasks' table in the database.
"""

class TaskStatus(enum.Enum):
    """
    Enum for defining possible statuses of a task.
    """
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Foreign key to the User model
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Define a relationship to the User model.
    # `back_populates="tasks"` creates a bidirectional relationship.
    # `lazy="joined"` means the owner will be loaded eagerly with the task when queried.
    owner = relationship("User", back_populates="tasks", lazy="joined")

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status.value}')>"

    # Example of a business logic method on the model
    def is_overdue(self) -> bool:
        if self.due_date and self.status != TaskStatus.COMPLETED:
            return self.due_date < datetime.utcnow()
        return False

    def can_transition_to(self, new_status: TaskStatus) -> bool:
        """
        Business logic to determine if a task can transition from its current status
        to a new status. This helps enforce valid state changes.
        """
        current_status = self.status

        if current_status == new_status:
            return True # No change

        if current_status == TaskStatus.PENDING:
            return new_status in [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.CANCELLED]
        elif current_status == TaskStatus.IN_PROGRESS:
            return new_status in [TaskStatus.PENDING, TaskStatus.COMPLETED, TaskStatus.CANCELLED]
        elif current_status == TaskStatus.COMPLETED:
            return False # Completed tasks cannot be changed (unless explicitly allowed, e.g., reopen)
        elif current_status == TaskStatus.CANCELLED:
            return False # Cancelled tasks cannot be changed (unless explicitly allowed, e.g., reopen)
        return False
```

```