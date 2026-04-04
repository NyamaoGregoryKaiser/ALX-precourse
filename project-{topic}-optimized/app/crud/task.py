from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate

class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    async def get_multi_by_project(
        self, db: AsyncSession, *, project_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Retrieve multiple tasks within a specific project."""
        stmt = (
            select(self.model)
            .filter(Task.project_id == project_id)
            .offset(skip)
            .limit(limit)
            .order_by(Task.due_date.asc(), Task.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_multi_by_assignee(
        self, db: AsyncSession, *, assignee_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Retrieve multiple tasks assigned to a specific user."""
        stmt = (
            select(self.model)
            .filter(Task.assignee_id == assignee_id)
            .offset(skip)
            .limit(limit)
            .order_by(Task.due_date.asc(), Task.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_with_project_and_assignee(self, db: AsyncSession, id: UUID) -> Optional[Task]:
        """Retrieve a task by ID, eagerly loading its project and assignee."""
        stmt = (
            select(self.model)
            .options(selectinload(Task.project), selectinload(Task.assignee))
            .filter(self.model.id == id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

task = CRUDTask(Task)
```