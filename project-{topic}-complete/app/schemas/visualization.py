```python
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.visualization import ChartType


class VisualizationBase(BaseModel):
    """Base schema for Visualization."""
    name: str = Field(min_length=3, max_length=100)
    description: str | None = None
    chart_type: ChartType
    config: dict[str, Any]  # Chart configuration (e.g., axes, colors, data mappings)
    dataset_id: uuid.UUID


class VisualizationCreate(VisualizationBase):
    """Schema for creating a new Visualization."""
    pass


class VisualizationUpdate(VisualizationBase):
    """Schema for updating an existing Visualization."""
    name: str | None = Field(None, min_length=3, max_length=100)
    chart_type: ChartType | None = None
    config: dict[str, Any] | None = None
    dataset_id: uuid.UUID | None = None


class VisualizationInDBBase(VisualizationBase):
    """Schema for Visualization as stored in DB."""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Visualization(VisualizationInDBBase):
    """Public schema for Visualization."""
    pass

class VisualizationData(BaseModel):
    """Schema for returning visualization data + config."""
    visualization: Visualization
    data: list[dict[str, Any]]
```