```python
import enum

from sqlalchemy import Column, Enum, ForeignKey, String, Text, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base, BaseMixin


class DatasetType(str, enum.Enum):
    """
    Enum for dataset types (e.g., raw SQL query, pre-processed data).
    """
    SQL_QUERY = "sql_query"
    CSV_FILE = "csv_file"  # If data source is CSV, the "dataset" might be the file itself
    # Add more types for different data processing scenarios


class Dataset(Base, BaseMixin):
    """
    SQLAlchemy model for Dataset.
    Represents a specific query or data extraction from a DataSource.
    """
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(DatasetType), nullable=False)
    query_string = Column(Text, nullable=True)  # SQL query, or path/id for CSV
    parameters = Column(JSON, nullable=True)  # JSON for query parameters, filters, etc.
    data_source_id = Column(ForeignKey("data_sources.id"), nullable=False)
    owner_id = Column(ForeignKey("users.id"), nullable=False)

    # Relationships
    data_source = relationship("DataSource", back_populates="datasets")
    owner = relationship("User", back_populates="datasets")
    visualizations = relationship("Visualization", back_populates="dataset")

    def __repr__(self):
        return f"<Dataset {self.name} (Source: {self.data_source_id})>"
```