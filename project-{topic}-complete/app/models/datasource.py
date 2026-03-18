```python
import enum

from sqlalchemy import Column, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base, BaseMixin


class DataSourceType(str, enum.Enum):
    """
    Enum for supported data source types.
    """
    POSTGRES = "postgresql"
    MYSQL = "mysql"
    SQLSERVER = "sqlserver"
    CSV = "csv"
    API = "api"
    # Add more as needed (e.g., S3, BigQuery, Snowflake)


class DataSource(Base, BaseMixin):
    """
    SQLAlchemy model for Data Source.
    Represents a connection to an external database or data file.
    """
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(DataSourceType), nullable=False)
    connection_string = Column(Text, nullable=False)  # Store encrypted in production
    owner_id = Column(ForeignKey("users.id"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="datasources")
    datasets = relationship("Dataset", back_populates="data_source")

    def __repr__(self):
        return f"<DataSource {self.name} ({self.type})>"
```