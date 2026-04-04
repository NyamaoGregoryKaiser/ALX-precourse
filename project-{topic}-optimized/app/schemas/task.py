from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date

class TaskBase(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: Optional[str] = Field(None, max_length=1000)
    status: str = Field("pending", pattern="^(pending|in-progress|completed)$")
    due_date: Optional[date] = None

class TaskCreate(TaskBase):
    project_id: UUID
    assignee_id: Optional[UUID] = None

class TaskUpdate(TaskBase):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    status: Optional[str] = Field(None, pattern="^(pending|in-progress|completed)$")
    assignee_id: Optional[UUID] = None
    project_id: Optional[UUID] = None # Allow changing project for a task

class TaskInDBBase(TaskBase):
    id: UUID
    project_id: UUID
    assignee_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Task(TaskInDBBase):
    pass
```