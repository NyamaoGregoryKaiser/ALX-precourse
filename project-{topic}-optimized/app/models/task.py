from sqlalchemy import Column, String, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from sqlalchemy.dialects.postgresql import UUID

class Task(Base):
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="pending", nullable=False) # e.g., "pending", "in-progress", "completed"
    due_date = Column(Date, nullable=True)

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # Optional assignee

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks")

    def __repr__(self):
        return (
            f"<Task(id={self.id}, title='{self.title}', "
            f"project_id='{self.project_id}', status='{self.status}')>"
        )
```