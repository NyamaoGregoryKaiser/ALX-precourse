```python
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.crud.base import CRUDBase
from app.db.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate

logger = logging.getLogger(__name__)

class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    async def get_by_name_and_owner(self, db: AsyncSession, *, name: str, owner_id: int) -> Optional[Category]:
        """
        Retrieve a category by its name and owner ID.
        """
        stmt = select(self.model).where(self.model.name == name, self.model.owner_id == owner_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi_by_owner_and_type(
        self, db: AsyncSession, *, owner_id: int, category_type: str, skip: int = 0, limit: int = 100
    ) -> List[Category]:
        """
        Retrieve multiple categories filtered by owner_id and type.
        """
        stmt = (
            select(self.model)
            .where(self.model.owner_id == owner_id, self.model.type == category_type)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()


crud_category = CRUDCategory(Category)
```