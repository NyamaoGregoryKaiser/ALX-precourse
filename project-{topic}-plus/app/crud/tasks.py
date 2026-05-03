from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.schemas.task import Task as DBTask, TaskStatus
from app.models.task import TaskCreate, TaskUpdate
from app.core.exceptions import NotFoundException, BadRequestException
from loguru import logger

async def get_task_by_id(db: AsyncSession, task_id: int) -> Optional[DBTask]:
    """Retrieve a task by its ID, loading its project and assignee."""
    logger.debug(f"Retrieving task with ID: {task_id}")
    result = await db.execute(
        select(DBTask)
        .options(selectinload(DBTask.project).selectinload(DBTask.project.owner))
        .options(selectinload(DBTask.assignee))
        .filter(DBTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        logger.debug(f"Task with ID {task_id} not found.")
    return task

async def get_tasks(
    db: AsyncSession,
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    search: Optional[str] = None,
    is_completed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[DBTask]:
    """
    Retrieve a list of tasks with optional filtering by project, assignee, status,
    search, and completion status. Includes pagination.
    """
    logger.debug(f"Retrieving tasks with filters: project_id={project_id}, assignee_id={assignee_id}, "
                 f"status={status}, search='{search}', is_completed={is_completed}, skip={skip}, limit={limit}")
    query = select(DBTask).options(
        selectinload(DBTask.project).selectinload(DBTask.project.owner),
        selectinload(DBTask.assignee)
    )

    if project_id:
        query = query.filter(DBTask.project_id == project_id)
    if assignee_id:
        query = query.filter(DBTask.assignee_id == assignee_id)
    if status:
        query = query.filter(DBTask.status == status)
    if is_completed is not None:
        query = query.filter(DBTask.is_completed == is_completed)
    if search:
        query = query.filter(
            (DBTask.title.ilike(f"%{search}%")) |
            (DBTask.description.ilike(f"%{search}%"))
        )

    query = query.offset(skip).limit(limit).order_by(DBTask.priority.asc(), DBTask.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

async def create_task(db: AsyncSession, task_in: TaskCreate) -> DBTask:
    """Create a new task."""
    logger.info(f"Creating new task '{task_in.title}' for project ID: {task_in.project_id}")

    # Optionally validate if project_id and assignee_id exist
    from app.crud import projects as crud_projects
    project = await crud_projects.get_project_by_id(db, task_in.project_id)
    if not project:
        logger.warning(f"Task creation failed: Project with ID {task_in.project_id} not found.")
        raise NotFoundException(detail=f"Project with ID {task_in.project_id} not found")

    if task_in.assignee_id:
        from app.crud import users as crud_users
        assignee = await crud_users.get_user_by_id(db, task_in.assignee_id)
        if not assignee:
            logger.warning(f"Task creation failed: Assignee with ID {task_in.assignee_id} not found.")
            raise NotFoundException(detail=f"Assignee with ID {task_in.assignee_id} not found")

    db_task = DBTask(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        project_id=task_in.project_id,
        assignee_id=task_in.assignee_id,
        due_date=task_in.due_date,
        is_completed=task_in.is_completed
    )
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    # Reload with relationships
    await db.refresh(db_task, attribute_names=["project", "assignee"])
    logger.info(f"Task '{db_task.title}' (ID: {db_task.id}) created successfully for project ID {db_task.project_id}.")
    return db_task

async def update_task(db: AsyncSession, task_id: int, task_in: TaskUpdate) -> DBTask:
    """Update an existing task."""
    logger.info(f"Updating task with ID: {task_id}")
    db_task = await get_task_by_id(db, task_id)
    if not db_task:
        logger.warning(f"Task update failed: Task with ID {task_id} not found.")
        raise NotFoundException(detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)

    # Validate assignee_id if it's being updated
    if "assignee_id" in update_data and update_data["assignee_id"] is not None:
        from app.crud import users as crud_users
        assignee = await crud_users.get_user_by_id(db, update_data["assignee_id"])
        if not assignee:
            logger.warning(f"Task update failed: Assignee with ID {update_data['assignee_id']} not found.")
            raise NotFoundException(detail=f"Assignee with ID {update_data['assignee_id']} not found")
    elif "assignee_id" in update_data and update_data["assignee_id"] is None:
        # Allow unsetting assignee
        pass

    for field, value in update_data.items():
        setattr(db_task, field, value)

    # If status is set to DONE, automatically set is_completed to True
    if db_task.status == TaskStatus.DONE:
        db_task.is_completed = True
    elif db_task.status != TaskStatus.DONE and db_task.is_completed:
        # If status changes from DONE to something else, uncheck is_completed, unless explicitly set
        if "is_completed" not in update_data or update_data["is_completed"] is not True:
            db_task.is_completed = False


    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    await db.refresh(db_task, attribute_names=["project", "assignee"]) # Refresh relationships
    logger.info(f"Task '{db_task.title}' (ID: {db_task.id}) updated successfully.")
    return db_task

async def delete_task(db: AsyncSession, task_id: int) -> bool:
    """Delete a task by its ID."""
    logger.info(f"Deleting task with ID: {task_id}")
    db_task = await get_task_by_id(db, task_id)
    if not db_task:
        logger.warning(f"Task deletion failed: Task with ID {task_id} not found.")
        raise NotFoundException(detail="Task not found")

    await db.delete(db_task)
    await db.commit()
    logger.info(f"Task (ID: {task_id}) deleted successfully.")
    return True
```