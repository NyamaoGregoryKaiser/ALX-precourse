from pydantic import BaseModel, HttpUrl
from typing import Dict, Optional

class ScraperConfigBase(BaseModel):
    name: str
    start_url: HttpUrl
    css_selectors: Dict[str, str] # e.g., {'title': 'h1.product-title', 'price': 'span.price'}
    description: Optional[str] = None
    is_active: bool = True

class ScraperConfigCreate(ScraperConfigBase):
    pass

class ScraperConfigUpdate(ScraperConfigBase):
    name: Optional[str] = None
    start_url: Optional[HttpUrl] = None
    css_selectors: Optional[Dict[str, str]] = None
    is_active: Optional[bool] = None

class ScraperConfigResponse(ScraperConfigBase):
    id: int
    user_id: int
    created_at: str # will be formatted datetime
    updated_at: str # will be formatted datetime

    class Config:
        from_attributes = True # Allow mapping from ORM objects
```