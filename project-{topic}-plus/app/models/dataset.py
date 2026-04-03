import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id: int = Column(Integer, primary_key=True, index=True)
    name: str = Column(String, index=True, nullable=False)
    description: str = Column(Text, nullable=True)
    file_path: str = Column(String, nullable=False) # e.g., S3 path or local storage path
    file_size_bytes: int = Column(Integer, nullable=True)
    file_type: str = Column(String, nullable=True) # e.g., csv, parquet, json
    rows_count: int = Column(Integer, nullable=True)
    columns_count: int = Column(Integer, nullable=True)
    uploaded_by_id: int = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    uploaded_by = relationship("User", backref="datasets")

    def __repr__(self):
        return f"<Dataset(id={self.id}, name='{self.name}', uploaded_by='{self.uploaded_by.email if self.uploaded_by else 'N/A'}')>"