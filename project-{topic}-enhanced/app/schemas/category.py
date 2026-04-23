```python
from typing import Optional
from pydantic import BaseModel, Field

# Shared properties
class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(pattern="^(income|expense)$", description="Must be 'income' or 'expense'")

# Properties to receive via API on creation
class CategoryCreate(CategoryBase):
    pass

# Properties to receive via API on update
class CategoryUpdate(CategoryBase):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[str] = Field(None, pattern="^(income|expense)$", description="Must be 'income' or 'expense'")

# Properties shared by models stored in DB
class CategoryInDBBase(CategoryBase):
    id: int
    owner_id: int

    class ConfigDict:
        from_attributes = True

# Properties to return via API
class Category(CategoryInDBBase):
    pass

# Properties stored in DB
class CategoryInDB(CategoryInDBBase):
    pass
```