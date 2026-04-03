from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.dataset import Dataset
from app.schemas.dataset import DatasetCreate, DatasetUpdate

class CRUDDataset(CRUDBase[Dataset, DatasetCreate, DatasetUpdate]):
    async def create_with_owner(
        self, db: AsyncSession, *, obj_in: DatasetCreate, owner_id: int
    ) -> Dataset:
        """
        Create a new dataset associated with an owner.
        """
        db_obj = self.model(**obj_in.model_dump(), uploaded_by_id=owner_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_multi_by_owner(
        self, db: AsyncSession, *, owner_id: int, skip: int = 0, limit: int = 100
    ) -> List[Dataset]:
        """
        Retrieve multiple datasets filtered by their owner.
        """
        result = await db.execute(
            select(self.model)
            .where(self.model.uploaded_by_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_name(self, db: AsyncSession, *, name: str) -> Optional[Dataset]:
        """
        Retrieve a dataset by its name.
        """
        result = await db.execute(select(self.model).where(self.model.name == name))
        return result.scalar_one_or_none()

crud_dataset = CRUDDataset(Dataset)