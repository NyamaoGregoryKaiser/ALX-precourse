from pydantic import BaseModel, Field
from typing import Optional
import datetime
from app.schemas.task import TaskStatus
from app.models.user import UserPublic # For assignee info
from app.models.project import ProjectListItem # For project info

# Shared properties
class TaskBase(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[TaskStatus] = TaskStatus.TO_DO
    priority: Optional[int] = Field(1, ge=1, le=5) # 1 is highest, 5 is lowest
    due_date: Optional[datetime.datetime] = None
    is_completed: Optional[bool] = False

# Properties to receive via API on creation
class TaskCreate(TaskBase):
    project_id: int
    assignee_id: Optional[int] = None

# Properties to receive via API on update
class TaskUpdate(TaskBase):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[TaskStatus] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    assignee_id: Optional[int] = None # Can unset by passing None explicitly
    due_date: Optional[datetime.datetime] = None
    is_completed: Optional[bool] = None

# Properties stored in DB
class TaskInDBBase(TaskBase):
    id: int
    project_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    assignee_id: Optional[int] = None # Ensure assignee_id is always present here

    class Config:
        from_attributes = True

# Properties to return to API
class Task(TaskInDBBase):
    project: ProjectListItem # Embed project info
    assignee: Optional[UserPublic] = None # Embed public user info for assignee
```