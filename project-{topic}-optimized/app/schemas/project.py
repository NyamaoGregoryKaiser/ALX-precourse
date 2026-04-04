from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

# Forward references for type hinting (Task schema isn't defined yet)
# from .task import Task # This causes circular import, use string for now

class ProjectBase(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class ProjectInDBBase(ProjectBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Project(ProjectInDBBase):
    # tasks: List["Task"] = [] # Include tasks when fetching a project
    pass

# Update forward refs
# Project.update_forward_refs()
```