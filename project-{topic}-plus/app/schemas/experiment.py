import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid

class ExperimentBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    artifacts_uri: Optional[str] = None
    status: str = Field("pending", pattern=r"^(pending|running|completed|failed)$")
    model_id: Optional[int] = None
    dataset_id: Optional[int] = None

class ExperimentCreate(ExperimentBase):
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4())) # Auto-generate unique run_id

class ExperimentUpdate(ExperimentBase):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    status: Optional[str] = Field(None, pattern=r"^(pending|running|completed|failed)$")

class ExperimentInDBBase(ExperimentBase):
    id: int
    run_id: str
    created_by_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class Experiment(ExperimentInDBBase):
    pass