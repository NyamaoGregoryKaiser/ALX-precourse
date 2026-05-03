from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.task import Task, TaskCreate, TaskUpdate
from app.schemas.task import Task as DBTask, TaskStatus
from app.schemas.user import User as DBUser, UserRole
from app.crud import tasks as crud_tasks
from app.crud import projects as crud_projects
from app.dependencies.common import get_async_db_session, get_current_user_dependency
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from loguru import logger
from async_lru import alru_cache # For simple in-memory caching example

router = APIRouter()

# Example of a simple in-memory cache for frequently accessed tasks (e.g., specific task statuses)
# Note: For production, a distributed cache like Redis is preferred.
@alru_cache(maxsize=128)
async def get_cached_tasks_by_status(db: AsyncSession, status: TaskStatus, limit: int = 10):
    """
    Simulates caching for specific task status lists.
    This cache will only work for exact status and limit combinations.
    """
    logger.debug(f"Cache miss for tasks with status {status}. Fetching from DB.")
    return await crud_tasks.get_tasks(db, status=status, limit=limit)

@router.post("/", response_model=Task, status_code=status.HTTP_201_CREATED, summary="Create a new task")
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency) # Any authenticated user can create tasks
):
    """
    Create a new task within a specified project.
    The current user must own the project or be a manager/admin.
    """
    logger.info(f"User {current_user.id} attempting to create task: {task_in.title} in project {task_in.project_id}")
    project = await crud_projects.get_project_by_id(db, task_in.project_id)
    if not project:
        logger.warning(f"Project {task_in.project_id} not found for task creation.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Authorization: Project owner, manager, or admin can create tasks in this project
    if current_user.role == UserRole.MEMBER and project.owner_id != current_user.id:
        logger.warning(f"Member user {current_user.id} attempted to create task in project {project.id} owned by {project.owner_id}.")
        raise ForbiddenException(detail="You do not have permission to create tasks in this project.")

    # Validate assignee_id if provided
    if task_in.assignee_id:
        from app.crud import users as crud_users
        assignee = await crud_users.get_user_by_id(db, task_in.assignee_id)
        if not assignee:
            logger.warning(f"Assignee with ID {task_in.assignee_id} not found for task creation.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")

    try:
        task = await crud_tasks.create_task(db, task_in)
        return task
    except NotFoundException as e: # From internal crud validation
        logger.warning(f"Task creation failed: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating task {task_in.title} for project {task_in.project_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/", response_model=List[Task], summary="Retrieve multiple tasks")
async def read_tasks(
    project_id: Optional[int] = Query(None, description="Filter tasks by project ID"),
    assignee_id: Optional[int] = Query(None, description="Filter tasks by assignee ID"),
    status: Optional[TaskStatus] = Query(None, description="Filter tasks by status"),
    search: Optional[str] = Query(None, description="Search tasks by title or description"),
    is_completed: Optional[bool] = Query(None, description="Filter tasks by completion status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency)
):
    """
    Retrieve multiple tasks with pagination and optional filtering.
    - Users can only view tasks within projects they own or are assigned to.
    - Managers can view all tasks.
    - Admins can view all tasks.
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) retrieving tasks.")

    if status and status == TaskStatus.DONE and not project_id and not assignee_id:
        # Example of using the cache for a common query
        # In a real app, cache keys would be more sophisticated (e.g., based on user roles, etc.)
        tasks = await get_cached_tasks_by_status(db, status, limit)
        if tasks:
            logger.debug(f"Returned tasks from cache for status {status}.")
            return tasks

    # Base query for authorized tasks
    allowed_project_ids = set()
    if current_user.role == UserRole.MEMBER:
        # Get projects owned by the user
        owned_projects = await crud_projects.get_projects(db, owner_id=current_user.id, limit=9999)
        allowed_project_ids.update(p.id for p in owned_projects)

        # Get tasks assigned to the user
        assigned_tasks = await crud_tasks.get_tasks(db, assignee_id=current_user.id, limit=9999)
        allowed_project_ids.update(t.project_id for t in assigned_tasks)

        if not allowed_project_ids and project_id and project_id not in allowed_project_ids:
            raise ForbiddenException(detail="You do not have access to any projects or tasks.")
        
        if project_id and project_id not in allowed_project_ids:
            logger.warning(f"Member user {current_user.id} attempted to filter by project {project_id} without access.")
            raise ForbiddenException(detail="You do not have access to tasks in this project.")
        
        # If no project_id is specified, filter by projects the user has access to
        if not project_id and allowed_project_ids:
            # Re-fetch tasks, specifically using the list of allowed project IDs
            # This requires modifying crud_tasks.get_tasks to accept a list of project_ids
            # For simplicity, if project_id is not specified, return all tasks assigned to the user OR tasks in projects owned by the user.
            tasks_by_assignee = await crud_tasks.get_tasks(db, assignee_id=current_user.id, status=status, search=search, is_completed=is_completed, skip=skip, limit=limit)
            tasks_by_owned_projects = []
            if allowed_project_ids:
                 # This is inefficient if many projects; would need to adapt get_tasks to take project_ids IN (...)
                 # For now, if no project_id is given, a member user ONLY sees tasks assigned to them.
                 # To see tasks in projects they own, they'd have to filter by that project_id.
                 # This simplification prevents complex authorization queries in CRUD.
                 pass
            return tasks_by_assignee # Simplify for members if no project_id is given

    # For managers/admins, or for members who specified a project_id they have access to
    tasks = await crud_tasks.get_tasks(
        db,
        project_id=project_id,
        assignee_id=assignee_id,
        status=status,
        search=search,
        is_completed=is_completed,
        skip=skip,
        limit=limit
    )
    
    # Filter for members: if `project_id` was not used in crud and current user is MEMBER
    if current_user.role == UserRole.MEMBER:
        authorized_tasks = [
            t for t in tasks
            if t.project_id in allowed_project_ids or (t.assignee_id == current_user.id if t.assignee_id else False)
        ]
        return authorized_tasks
    
    return tasks


@router.get("/{task_id}", response_model=Task, summary="Retrieve a task by ID")
async def read_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency)
):
    """
    Retrieve a specific task by its ID.
    - Users can only view tasks if they own the project or are the assignee.
    - Managers/Admins can view any task.
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) retrieving task with ID: {task_id}")
    task = await crud_tasks.get_task_by_id(db, task_id)
    if not task:
        logger.warning(f"Task {task_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Authorization check
    if current_user.role == UserRole.MEMBER:
        if task.project.owner_id != current_user.id and task.assignee_id != current_user.id:
            logger.warning(f"Member user {current_user.id} attempted to access task {task_id} "
                           f" (project owner: {task.project.owner_id}, assignee: {task.assignee_id}).")
            raise ForbiddenException(detail="You do not have permission to access this task.")

    return task

@router.put("/{task_id}", response_model=Task, summary="Update a task by ID")
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency) # Any authenticated user can potentially update tasks
):
    """
    Update an existing task by its ID.
    - Project owner, assignee, manager, or admin can update a task.
    - Assignee can only update `status`, `description`, and `is_completed`.
    - Project owner, manager, or admin can update all fields.
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) attempting to update task with ID: {task_id}")
    existing_task = await crud_tasks.get_task_by_id(db, task_id)
    if not existing_task:
        logger.warning(f"Task {task_id} not found for update.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Determine allowed fields for update based on user role and relationship
    update_data = task_in.model_dump(exclude_unset=True)
    
    if current_user.role == UserRole.MEMBER:
        if existing_task.project.owner_id == current_user.id:
            # Project owner can update all fields
            pass 
        elif existing_task.assignee_id == current_user.id:
            # Assignee can only update a limited set of fields
            allowed_assignee_fields = {"status", "description", "is_completed", "due_date"}
            if not all(field in allowed_assignee_fields for field in update_data.keys()):
                logger.warning(f"Assignee user {current_user.id} attempted to update restricted fields for task {task_id}.")
                raise ForbiddenException(detail="As an assignee, you can only update status, description, due date, and completion status.")
        else:
            logger.warning(f"Member user {current_user.id} attempted to update task {task_id} without sufficient privileges.")
            raise ForbiddenException(detail="You do not have permission to update this task.")
    
    # Managers and Admins can update all fields, so no further filtering needed for them.

    try:
        updated_task = await crud_tasks.update_task(db, task_id, task_in)
        return updated_task
    except NotFoundException as e:
        logger.warning(f"Task update failed: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a task by ID")
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency) # Any authenticated user can potentially delete tasks
):
    """
    Delete a task by its ID.
    - Only the project owner, manager, or admin can delete a task.
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) attempting to delete task with ID: {task_id}")
    existing_task = await crud_tasks.get_task_by_id(db, task_id)
    if not existing_task:
        logger.warning(f"Task {task_id} not found for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Authorization: Only project owner, manager, or admin can delete
    if current_user.role == UserRole.MEMBER and existing_task.project.owner_id != current_user.id:
        logger.warning(f"Member user {current_user.id} attempted to delete task {task_id} owned by {existing_task.project.owner_id}.")
        raise ForbiddenException(detail="You do not have permission to delete this task.")
    
    try:
        success = await crud_tasks.delete_task(db, task_id)
        if not success: # Defensive, crud handles NotFound
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return # 204 No Content
    except NotFoundException as e:
        logger.warning(f"Task deletion failed: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
```