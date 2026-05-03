from pydantic import BaseModel, Field
from typing import Optional, List
import datetime
from app.schemas.project import ProjectStatus
from app.models.user import UserPublic # For owner info

# Shared properties
class ProjectBase(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[ProjectStatus] = ProjectStatus.NOT_STARTED

# Properties to receive via API on creation
class ProjectCreate(ProjectBase):
    pass

# Properties to receive via API on update
class ProjectUpdate(ProjectBase):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[ProjectStatus] = None

# Properties stored in DB
class ProjectInDBBase(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# Properties to return to API
class Project(ProjectInDBBase):
    owner: UserPublic # Embed public user info
    # tasks: List["Task"] = [] # Avoid circular dependency, handle separately if needed

# For Project list responses
class ProjectListItem(ProjectInDBBase):
    owner: UserPublic
```