from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate

"""
CRUD (Create, Read, Update, Delete) operations for the Task model.
This module encapsulates all database interactions related to tasks.
"""

class CRUDTask:
    def __init__(self, model):
        self.model = model

    async def get(self, db: AsyncSession, task_id: int) -> Optional[Task]:
        """
        Retrieves a task by its ID.

        Args:
            db (AsyncSession): The database session.
            task_id (int): The ID of the task to retrieve.

        Returns:
            Optional[Task]: The Task object if found, otherwise None.
        """
        result = await db.execute(select(self.model).filter(self.model.id == task_id))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        db: AsyncSession,
        user_id: Optional[int] = None,
        status: Optional[TaskStatus] = None,
        due_date_before: Optional[datetime] = None,
        due_date_after: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Task]:
        """
        Retrieves all tasks with various filtering and pagination options.

        Args:
            db (AsyncSession): The database session.
            user_id (Optional[int]): Filter tasks by owner user ID.
            status (Optional[TaskStatus]): Filter tasks by status.
            due_date_before (Optional[datetime]): Filter tasks with due date before this time.
            due_date_after (Optional[datetime]): Filter tasks with due date after this time.
            skip (int): Number of records to skip.
            limit (int): Maximum number of records to return.

        Returns:
            List[Task]: A list of Task objects.
        """
        query = select(self.model)

        if user_id is not None:
            query = query.filter(self.model.user_id == user_id)
        if status:
            query = query.filter(self.model.status == status)
        if due_date_before:
            query = query.filter(self.model.due_date < due_date_before)
        if due_date_after:
            query = query.filter(self.model.due_date > due_date_after)

        query = query.offset(skip).limit(limit).order_by(self.model.created_at.desc()) # Order by latest first
        result = await db.execute(query)
        return result.scalars().all()

    async def count(
        self,
        db: AsyncSession,
        user_id: Optional[int] = None,
        status: Optional[TaskStatus] = None,
    ) -> int:
        """
        Counts the total number of tasks, optionally filtered by user and status.

        Args:
            db (AsyncSession): The database session.
            user_id (Optional[int]): Filter tasks by owner user ID.
            status (Optional[TaskStatus]): Filter tasks by status.

        Returns:
            int: Total count of tasks.
        """
        query = select(func.count(self.model.id))
        if user_id is not None:
            query = query.filter(self.model.user_id == user_id)
        if status:
            query = query.filter(self.model.status == status)

        result = await db.execute(query)
        return result.scalar_one()

    async def create(self, db: AsyncSession, task_in: TaskCreate, user_id: int) -> Task:
        """
        Creates a new task for a specific user.

        Args:
            db (AsyncSession): The database session.
            task_in (TaskCreate): The Pydantic schema for creating a task.
            user_id (int): The ID of the user who owns this task.

        Returns:
            Task: The newly created Task object.
        """
        db_task = self.model(**task_in.model_dump(), user_id=user_id)
        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)
        return db_task

    async def update(self, db: AsyncSession, db_task: Task, task_update: TaskUpdate) -> Task:
        """
        Updates an existing task.

        Args:
            db (AsyncSession): The database session.
            db_task (Task): The existing Task object to update.
            task_update (TaskUpdate): The Pydantic schema with updated task data.

        Returns:
            Task: The updated Task object.
        """
        update_data = task_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            # Special handling for enum fields if necessary, though Pydantic generally handles it.
            # Example: if field == "status" and isinstance(value, str):
            #    setattr(db_task, field, TaskStatus(value))
            setattr(db_task, field, value)
        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)
        return db_task

    async def delete(self, db: AsyncSession, task_id: int) -> Optional[Task]:
        """
        Deletes a task by its ID.

        Args:
            db (AsyncSession): The database session.
            task_id (int): The ID of the task to delete.

        Returns:
            Optional[Task]: The deleted Task object if found and deleted, otherwise None.
        """
        task = await self.get(db, task_id)
        if task:
            await db.delete(task)
            await db.commit()
            return task
        return None

# Instantiate the CRUD operations for Task
crud_task = CRUDTask(Task)
```

```