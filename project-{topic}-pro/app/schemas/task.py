from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.task import TaskStatus
from app.schemas.user import UserResponse

"""
Pydantic schemas for Task data validation, request, and response models.
These define the data structures for API interactions related to tasks.
"""

class TaskBase(BaseModel):
    """Base schema for tasks, including common fields."""
    title: str = Field(..., min_length=1, max_length=255, example="Buy groceries", description="Title of the task")
    description: Optional[str] = Field(None, example="Milk, eggs, bread, fruits", description="Detailed description of the task")
    due_date: Optional[datetime] = Field(None, example="2023-11-15T18:00:00", description="Optional due date for the task")

class TaskCreate(TaskBase):
    """Schema for creating a new task."""
    # user_id is typically inferred from the authenticated user, not provided directly in create request
    # but for completeness or if admin creates for another user, it could be optional
    pass

class TaskUpdate(TaskBase):
    """Schema for updating an existing task."""
    status: Optional[TaskStatus] = Field(None, example=TaskStatus.IN_PROGRESS, description="Current status of the task")
    # All fields are optional for updates as only some might be changed.

class TaskResponse(TaskBase):
    """Schema for task data returned in API responses (includes database-generated fields)."""
    id: int = Field(..., example=1, description="Unique identifier for the task")
    status: TaskStatus = Field(TaskStatus.PENDING, example=TaskStatus.PENDING, description="Current status of the task")
    user_id: int = Field(..., example=1, description="ID of the user who owns this task")
    created_at: datetime = Field(..., example="2023-10-27T10:00:00.000000", description="Timestamp of task creation")
    updated_at: datetime = Field(..., example="2023-10-27T10:00:00.000000", description="Timestamp of last update")

    class Config:
        from_attributes = True # Allows Pydantic to read ORM objects

class TaskResponseWithUser(TaskResponse):
    """Schema for task data including the associated user details."""
    owner: UserResponse = Field(..., description="Details of the user who owns this task")
```

```