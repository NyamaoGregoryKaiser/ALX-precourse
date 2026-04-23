```python
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

# Shared properties
class TransactionBase(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0, description="Amount must be positive")
    type: str = Field(pattern="^(income|expense)$", description="Must be 'income' or 'expense'")
    transaction_date: Optional[datetime] = None
    category_id: int = Field(gt=0, description="Category ID must be positive")

# Properties to receive via API on creation
class TransactionCreate(TransactionBase):
    pass

# Properties to receive via API on update
class TransactionUpdate(TransactionBase):
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, gt=0, description="Amount must be positive")
    type: Optional[str] = Field(None, pattern="^(income|expense)$", description="Must be 'income' or 'expense'")
    category_id: Optional[int] = Field(None, gt=0, description="Category ID must be positive")

# Properties shared by models stored in DB
class TransactionInDBBase(TransactionBase):
    id: int
    owner_id: int
    transaction_date: datetime # Required in DB, optional for create/update

    class ConfigDict:
        from_attributes = True

# Properties to return via API
class Transaction(TransactionInDBBase):
    pass

# Properties stored in DB
class TransactionInDB(TransactionInDBBase):
    pass
```