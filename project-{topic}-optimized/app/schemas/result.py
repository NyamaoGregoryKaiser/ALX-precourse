from pydantic import BaseModel, HttpUrl
from typing import Dict, Any
from datetime import datetime

class ScrapingResultResponse(BaseModel):
    id: int
    job_id: int
    data: Dict[str, Any] # Flexible JSON data
    url: Optional[HttpUrl] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```