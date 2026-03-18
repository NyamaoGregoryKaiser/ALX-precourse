```python
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.datasource import DataSourceType


class DataSourceBase(BaseModel):
    """Base schema for Data Source."""
    name: str = Field(min_length=3, max_length=100)
    description: str | None = None
    type: DataSourceType
    connection_string: str = Field(min_length=1)


class DataSourceCreate(DataSourceBase):
    """Schema for creating a new Data Source."""
    pass


class DataSourceUpdate(DataSourceBase):
    """Schema for updating an existing Data Source."""
    name: str | None = Field(None, min_length=3, max_length=100)
    type: DataSourceType | None = None
    connection_string: str | None = Field(None, min_length=1)


class DataSourceInDBBase(DataSourceBase):
    """Schema for Data Source as stored in DB."""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataSource(DataSourceInDBBase):
    """Public schema for Data Source."""
    pass
```