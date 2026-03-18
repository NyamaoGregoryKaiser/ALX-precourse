```python
import enum

from sqlalchemy import Column, Enum, ForeignKey, String, Text, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base, BaseMixin


class ChartType(str, enum.Enum):
    """
    Enum for supported chart types.
    """
    BAR_CHART = "bar"
    LINE_CHART = "line"
    PIE_CHART = "pie"
    SCATTER_PLOT = "scatter"
    TABLE = "table"
    # Add more chart types (e.g., area, histogram, heatmap)


class Visualization(Base, BaseMixin):
    """
    SQLAlchemy model for Visualization.
    Represents a single chart or data display.
    """
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    chart_type = Column(Enum(ChartType), nullable=False)
    config = Column(JSON, nullable=False)  # JSON for chart configuration (e.g., axes, colors, filters)
    dataset_id = Column(ForeignKey("datasets.id"), nullable=False)
    owner_id = Column(ForeignKey("users.id"), nullable=False)

    # Relationships
    dataset = relationship("Dataset", back_populates="visualizations")
    owner = relationship("User", back_populates="visualizations")
    # No direct relationship to dashboard, but dashboards reference visualizations by ID (via JSON)

    def __repr__(self):
        return f"<Visualization {self.name} ({self.chart_type})>"
```