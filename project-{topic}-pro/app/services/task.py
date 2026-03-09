from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate
from app.crud.task import crud_task
from app.crud.user import crud_user
from app.core.exceptions import (
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    TaskStatusInvalidException
)
from app.core.logging_config import logger

"""
Business logic service for Task-related operations.
It handles creating, retrieving, updating, and deleting tasks,
including permission checks and complex filtering.
"""

class TaskService:
    def __init__(self, task_crud=crud_task, user_crud=crud_user):
        self.task_crud = task_crud
        self.user_crud = user_crud

    async def create_task(self, db: AsyncSession, task_in: TaskCreate, current_user: User) -> Task:
        """
        Creates a new task for the current authenticated user.

        Args:
            db (AsyncSession): The database session.
            task_in (TaskCreate): Data for creating the task.
            current_user (User): The authenticated user creating the task.

        Returns:
            Task: The newly created task object.
        """
        new_task = await self.task_crud.create(db, task_in, current_user.id)
        logger.info(f"User {current_user.email} (ID: {current_user.id}) created task '{new_task.title}' (ID: {new_task.id}).")
        return new_task

    async def get_task_by_id(self, db: AsyncSession, task_id: int, current_user: User) -> Task:
        """
        Retrieves a single task by its ID, ensuring the current user has access.

        Args:
            db (AsyncSession): The database session.
            task_id (int): The ID of the task to retrieve.
            current_user (User): The authenticated user requesting the task.

        Returns:
            Task: The retrieved task object.

        Raises:
            NotFoundException: If the task does not exist.
            ForbiddenException: If the user does not own the task and is not an admin.
        """
        task = await self.task_crud.get(db, task_id)
        if not task:
            logger.warning(f"Task with ID {task_id} not found.")
            raise NotFoundException(detail=f"Task with ID {task_id} not found")

        # Check ownership or admin privilege
        if task.user_id != current_user.id and not current_user.is_admin:
            logger.warning(f"User {current_user.id} attempted to access task {task_id} owned by {task.user_id}.")
            raise ForbiddenException(detail="Not authorized to access this task")

        logger.debug(f"User {current_user.id} accessed task {task.id}.")
        return task

    async def get_user_tasks(
        self,
        db: AsyncSession,
        current_user: User,
        status: Optional[TaskStatus] = None,
        due_date_before: Optional[datetime] = None,
        due_date_after: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Task]:
        """
        Retrieves all tasks for the current authenticated user with optional filters.

        Args:
            db (AsyncSession): The database session.
            current_user (User): The authenticated user.
            status (Optional[TaskStatus]): Filter tasks by status.
            due_date_before (Optional[datetime]): Filter tasks due before this date.
            due_date_after (Optional[datetime]): Filter tasks due after this date.
            skip (int): Number of records to skip.
            limit (int): Maximum number of records to return.

        Returns:
            List[Task]: A list of task objects.
        """
        tasks = await self.task_crud.get_all(
            db,
            user_id=current_user.id,
            status=status,
            due_date_before=due_date_before,
            due_date_after=due_date_after,
            skip=skip,
            limit=limit,
        )
        logger.debug(f"User {current_user.id} retrieved {len(tasks)} tasks.")
        return tasks
    
    async def get_all_tasks_admin(
        self,
        db: AsyncSession,
        status: Optional[TaskStatus] = None,
        user_id: Optional[int] = None,
        due_date_before: Optional[datetime] = None,
        due_date_after: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Task]:
        """
        (Admin-only) Retrieves all tasks in the system with optional filters.

        Args:
            db (AsyncSession): The database session.
            status (Optional[TaskStatus]): Filter tasks by status.
            user_id (Optional[int]): Filter tasks by owner ID.
            due_date_before (Optional[datetime]): Filter tasks due before this date.
            due_date_after (Optional[datetime]): Filter tasks due after this date.
            skip (int): Number of records to skip.
            limit (int): Maximum number of records to return.

        Returns:
            List[Task]: A list of task objects.
        """
        tasks = await self.task_crud.get_all(
            db,
            user_id=user_id, # Admin can filter by any user_id
            status=status,
            due_date_before=due_date_before,
            due_date_after=due_date_after,
            skip=skip,
            limit=limit,
        )
        logger.debug(f"Admin retrieved {len(tasks)} tasks.")
        return tasks


    async def update_task(self, db: AsyncSession, task_id: int, task_update: TaskUpdate, current_user: User) -> Task:
        """
        Updates an existing task, ensuring the current user has ownership/admin rights.

        Args:
            db (AsyncSession): The database session.
            task_id (int): The ID of the task to update.
            task_update (TaskUpdate): The data to update the task with.
            current_user (User): The authenticated user attempting to update the task.

        Returns:
            Task: The updated task object.

        Raises:
            NotFoundException: If the task does not exist.
            ForbiddenException: If the user does not own the task and is not an admin.
            TaskStatusInvalidException: If the status transition is invalid.
        """
        db_task = await self.get_task_by_id(db, task_id, current_user) # Reuses access check

        # Apply status transition logic if status is being updated
        if task_update.status is not None and task_update.status != db_task.status:
            if not db_task.can_transition_to(task_update.status):
                logger.warning(
                    f"Invalid status transition for task {db_task.id}: "
                    f"from {db_task.status.value} to {task_update.status.value}"
                )
                raise TaskStatusInvalidException(
                    detail=f"Cannot change task status from {db_task.status.value} to {task_update.status.value}"
                )

        updated_task = await self.task_crud.update(db, db_task, task_update)
        logger.info(f"User {current_user.id} updated task {updated_task.id}.")
        return updated_task

    async def delete_task(self, db: AsyncSession, task_id: int, current_user: User) -> None:
        """
        Deletes a task, ensuring the current user has ownership/admin rights.

        Args:
            db (AsyncSession): The database session.
            task_id (int): The ID of the task to delete.
            current_user (User): The authenticated user attempting to delete the task.

        Returns:
            None

        Raises:
            NotFoundException: If the task does not exist.
            ForbiddenException: If the user does not own the task and is not an admin.
        """
        db_task = await self.get_task_by_id(db, task_id, current_user) # Reuses access check
        await self.task_crud.delete(db, db_task.id)
        logger.info(f"User {current_user.id} deleted task {db_task.id}.")

task_service = TaskService()
```

```