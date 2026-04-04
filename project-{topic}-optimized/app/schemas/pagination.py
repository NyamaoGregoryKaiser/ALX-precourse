from typing import Generic, List, TypeVar
from pydantic import BaseModel, Field

# Define a TypeVar for the item type in the paginated response
T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic Pydantic model for paginated API responses.
    """
    total: int = Field(..., description="Total number of items available across all pages.")
    skip: int = Field(..., description="Number of items skipped (offset) for the current page.")
    limit: int = Field(..., description="Maximum number of items requested per page.")
    data: List[T] = Field(..., description="List of items for the current page.")
```