import datetime
from typing import Optional
from pydantic import BaseModel, Field

class DatasetBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    file_path: str = Field(..., min_length=5) # e.g., s3://bucket/path/to/data.csv
    file_size_bytes: Optional[int] = Field(None, ge=0)
    file_type: Optional[str] = None
    rows_count: Optional[int] = Field(None, ge=0)
    columns_count: Optional[int] = Field(None, ge=0)

class DatasetCreate(DatasetBase):
    pass

class DatasetUpdate(DatasetBase):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    file_path: Optional[str] = Field(None, min_length=5) # Make file_path optional for updates

class DatasetInDBBase(DatasetBase):
    id: int
    uploaded_by_id: int
    uploaded_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class Dataset(DatasetInDBBase):
    pass