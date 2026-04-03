import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class MLModelBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    version: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    model_path: str = Field(..., min_length=5)
    framework: Optional[str] = None
    task_type: Optional[str] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None

class MLModelCreate(MLModelBase):
    pass

class MLModelUpdate(MLModelBase):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    version: Optional[str] = Field(None, min_length=1, max_length=50)
    model_path: Optional[str] = Field(None, min_length=5)

class MLModelInDBBase(MLModelBase):
    id: int
    registered_by_id: int
    registered_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class MLModel(MLModelInDBBase):
    pass