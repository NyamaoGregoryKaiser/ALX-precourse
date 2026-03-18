```python
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.dataset import DatasetType


class DatasetBase(BaseModel):
    """Base schema for Dataset."""
    name: str = Field(min_length=3, max_length=100)
    description: str | None = None
    type: DatasetType
    query_string: str | None = None
    parameters: dict[str, Any] | None = None
    data_source_id: uuid.UUID


class DatasetCreate(DatasetBase):
    """Schema for creating a new Dataset."""
    pass


class DatasetUpdate(DatasetBase):
    """Schema for updating an existing Dataset."""
    name: str | None = Field(None, min_length=3, max_length=100)
    type: DatasetType | None = None
    query_string: str | None = None
    parameters: dict[str, Any] | None = None
    data_source_id: uuid.UUID | None = None


class DatasetInDBBase(DatasetBase):
    """Schema for Dataset as stored in DB."""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Dataset(DatasetInDBBase):
    """Public schema for Dataset."""
    pass
```