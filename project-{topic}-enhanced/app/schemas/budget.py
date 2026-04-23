```python
from typing import Optional
from datetime import date
from pydantic import BaseModel, Field

# Shared properties
class BudgetBase(BaseModel):
    amount: float = Field(gt=0, description="Amount must be positive")
    start_date: date
    end_date: date
    category_id: int = Field(gt=0, description="Category ID must be positive")

# Properties to receive via API on creation
class BudgetCreate(BudgetBase):
    pass

# Properties to receive via API on update
class BudgetUpdate(BudgetBase):
    amount: Optional[float] = Field(None, gt=0, description="Amount must be positive")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[int] = Field(None, gt=0, description="Category ID must be positive")

# Properties shared by models stored in DB
class BudgetInDBBase(BudgetBase):
    id: int
    owner_id: int

    class ConfigDict:
        from_attributes = True

# Properties to return via API
class Budget(BudgetInDBBase):
    pass

# Properties stored in DB
class BudgetInDB(BudgetInDBBase):
    pass
```