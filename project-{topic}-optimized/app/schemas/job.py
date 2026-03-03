from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class JobStatusEnum(str):
    PENDING = 'PENDING'
    RUNNING = 'RUNNING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    CANCELLED = 'CANCELLED'

class ScrapingJobCreate(BaseModel):
    scraper_config_id: int

class ScrapingJobResponse(BaseModel):
    id: int
    scraper_config_id: int
    user_id: int
    status: JobStatusEnum
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    celery_task_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```