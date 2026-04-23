```python
import logging
from typing import List, Optional
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.db.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetUpdate

logger = logging.getLogger(__name__)

class CRUDBudget(CRUDBase[Budget, BudgetCreate, BudgetUpdate]):
    async def get_active_budgets_by_owner(
        self, db: AsyncSession, *, owner_id: int, current_date: date, skip: int = 0, limit: int = 100
    ) -> List[Budget]:
        """
        Retrieve active budgets for a given owner based on the current date.
        """
        stmt = (
            select(self.model)
            .where(
                self.model.owner_id == owner_id,
                self.model.start_date <= current_date,
                self.model.end_date >= current_date
            )
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_by_owner_category_and_period(
        self, db: AsyncSession, *, owner_id: int, category_id: int, start_date: date, end_date: date
    ) -> Optional[Budget]:
        """
        Retrieve a budget by owner, category, and date range.
        This helps in preventing overlapping budgets for the same category/period.
        """
        stmt = (
            select(self.model)
            .where(
                self.model.owner_id == owner_id,
                self.model.category_id == category_id,
                self.model.start_date == start_date,
                self.model.end_date == end_date
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


crud_budget = CRUDBudget(Budget)
```