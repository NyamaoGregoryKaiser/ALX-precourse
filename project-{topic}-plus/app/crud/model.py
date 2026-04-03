from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.model import MLModel
from app.schemas.model import MLModelCreate, MLModelUpdate

class CRUDMLModel(CRUDBase[MLModel, MLModelCreate, MLModelUpdate]):
    async def create_with_owner(
        self, db: AsyncSession, *, obj_in: MLModelCreate, owner_id: int
    ) -> MLModel:
        """
        Create a new ML model associated with a registered user.
        """
        db_obj = self.model(**obj_in.model_dump(), registered_by_id=owner_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_name_and_version(self, db: AsyncSession, *, name: str, version: str) -> Optional[MLModel]:
        """
        Retrieve an ML model by its name and version.
        """
        result = await db.execute(
            select(self.model)
            .where(self.model.name == name, self.model.version == version)
        )
        return result.scalar_one_or_none()

    async def get_multi_by_owner(
        self, db: AsyncSession, *, owner_id: int, skip: int = 0, limit: int = 100
    ) -> List[MLModel]:
        """
        Retrieve multiple ML models filtered by their owner.
        """
        result = await db.execute(
            select(self.model)
            .where(self.model.registered_by_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

crud_ml_model = CRUDMLModel(MLModel)