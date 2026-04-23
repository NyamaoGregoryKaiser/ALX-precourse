```python
import logging
from typing import List, Optional
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.db.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate

logger = logging.getLogger(__name__)

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    async def get_multi_by_owner_and_category(
        self, db: AsyncSession, *, owner_id: int, category_id: int, skip: int = 0, limit: int = 100
    ) -> List[Transaction]:
        """
        Retrieve multiple transactions filtered by owner_id and category_id.
        """
        stmt = (
            select(self.model)
            .where(self.model.owner_id == owner_id, self.model.category_id == category_id)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_balance_by_owner(self, db: AsyncSession, *, owner_id: int) -> float:
        """
        Calculate the total balance (income - expense) for a given owner.
        """
        income_subquery = select(func.sum(self.model.amount)).where(
            self.model.owner_id == owner_id,
            self.model.type == "income"
        ).scalar_subquery()

        expense_subquery = select(func.sum(self.model.amount)).where(
            self.model.owner_id == owner_id,
            self.model.type == "expense"
        ).scalar_subquery()

        income_result = await db.execute(income_subquery)
        income_sum = income_result.scalar_one_or_none() or 0.0

        expense_result = await db.execute(expense_subquery)
        expense_sum = expense_result.scalar_one_or_none() or 0.0

        return income_sum - expense_sum

    async def get_total_by_category_and_period(
        self, db: AsyncSession, *, owner_id: int, category_id: int, start_date: datetime, end_date: datetime
    ) -> float:
        """
        Calculate total amount for a specific category within a date range for a given owner.
        """
        stmt = select(func.sum(self.model.amount)).where(
            self.model.owner_id == owner_id,
            self.model.category_id == category_id,
            self.model.transaction_date >= start_date,
            self.model.transaction_date <= end_date
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() or 0.0

crud_transaction = CRUDTransaction(Transaction)
```