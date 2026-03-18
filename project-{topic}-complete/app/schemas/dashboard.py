```python
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DashboardBase(BaseModel):
    """Base schema for Dashboard."""
    name: str = Field(min_length=3, max_length=100)
    description: str | None = None
    layout: dict[str, Any]  # JSON representation of dashboard layout and contained visualizations


class DashboardCreate(DashboardBase):
    """Schema for creating a new Dashboard."""
    pass


class DashboardUpdate(DashboardBase):
    """Schema for updating an existing Dashboard."""
    name: str | None = Field(None, min_length=3, max_length=100)
    layout: dict[str, Any] | None = None


class DashboardInDBBase(DashboardBase):
    """Schema for Dashboard as stored in DB."""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Dashboard(DashboardInDBBase):
    """Public schema for Dashboard."""
    pass
```