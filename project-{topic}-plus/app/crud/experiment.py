from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.experiment import Experiment
from app.schemas.experiment import ExperimentCreate, ExperimentUpdate

class CRUDExperiment(CRUDBase[Experiment, ExperimentCreate, ExperimentUpdate]):
    async def create_with_owner(
        self, db: AsyncSession, *, obj_in: ExperimentCreate, owner_id: int
    ) -> Experiment:
        """
        Create a new experiment associated with an owner.
        """
        db_obj = self.model(**obj_in.model_dump(), created_by_id=owner_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_run_id(self, db: AsyncSession, *, run_id: str) -> Optional[Experiment]:
        """
        Retrieve an experiment by its unique run_id.
        """
        result = await db.execute(select(self.model).where(self.model.run_id == run_id))
        return result.scalar_one_or_none()

    async def get_multi_by_owner(
        self, db: AsyncSession, *, owner_id: int, skip: int = 0, limit: int = 100
    ) -> List[Experiment]:
        """
        Retrieve multiple experiments filtered by their owner.
        """
        result = await db.execute(
            select(self.model)
            .where(self.model.created_by_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

crud_experiment = CRUDExperiment(Experiment)