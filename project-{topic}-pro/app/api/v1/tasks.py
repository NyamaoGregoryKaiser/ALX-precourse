from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, status, Query, Depends
from fastapi_limiter.depends import RateLimiter

from app.models.task import TaskStatus
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate, TaskResponseWithUser
from app.services.task import task_service
from app.core.dependencies import DBSession, CurrentUser, CurrentAdminUser
from app.core.exceptions import (
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    TaskStatusInvalidException
)
from app.core.logging_config import logger
from app.utils.caching import cache_response, invalidate_cache

"""
API Router for task-related endpoints.
Handles CRUD operations for tasks, with user ownership and admin access controls.
Includes caching and rate limiting examples.
"""

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post(
    "/",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
    description="Creates a new task for the authenticated user."
)
async def create_task(
    task_create: TaskCreate,
    db: DBSession,
    current_user: CurrentUser,
    # Add rate limiting for creation to prevent abuse
    rate_limiter: Annotated[None, Depends(RateLimiter(times=5, seconds=60))] = None
):
    """
    Creates a task.
    - **title**: The title of the task.
    - **description**: Optional detailed description.
    - **due_date**: Optional due date for the task.
    """
    logger.info(f"User {current_user.id} attempting to create a new task.")
    try:
        new_task = await task_service.create_task(db, task_create, current_user)
        await invalidate_cache(f"cache:get_user_tasks:*user_id:{current_user.id}*") # Invalidate user's task list cache
        await invalidate_cache("cache:get_all_tasks_admin:*") # Invalidate admin's task list cache
        return new_task
    except Exception as e:
        logger.error(f"Error creating task for user {current_user.id}: {e}", exc_info=True)
        raise BadRequestException(detail="Failed to create task due to an unexpected error.")


@router.get(
    "/me",
    response_model=List[TaskResponse],
    summary="Get tasks for the current user",
    description="Retrieves a list of tasks owned by the currently authenticated user with optional filters."
)
@cache_response(key_prefix="cache", expiration=30) # Cache user's task list for 30 seconds
async def read_my_tasks(
    db: DBSession,
    current_user: CurrentUser,
    status: Optional[TaskStatus] = Query(None, description="Filter tasks by status"),
    due_date_before: Optional[datetime] = Query(None, description="Filter tasks due before this date (ISO 8601)"),
    due_date_after: Optional[datetime] = Query(None, description="Filter tasks due after this date (ISO 8601)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    """
    Returns tasks for the authenticated user, with optional filters.
    """
    logger.debug(f"User {current_user.id} requesting their tasks.")
    tasks = await task_service.get_user_tasks(
        db, current_user, status, due_date_before, due_date_after, skip, limit
    )
    return tasks

@router.get(
    "/{task_id}",
    response_model=TaskResponseWithUser, # Return with user details
    summary="Get a single task by ID",
    description="Retrieves a specific task by its ID. Requires ownership or admin privileges."
)
async def read_task_by_id(
    task_id: int,
    db: DBSession,
    current_user: CurrentUser
):
    """
    Returns a single task by ID.
    - **task_id**: The ID of the task to retrieve.
    """
    logger.debug(f"User {current_user.id} requesting task {task_id}.")
    try:
        task = await task_service.get_task_by_id(db, task_id, current_user)
        return task
    except (NotFoundException, ForbiddenException) as e:
        raise e
    except Exception as e:
        logger.error(f"Error reading task {task_id} for user {current_user.id}: {e}", exc_info=True)
        raise BadRequestException(detail="Failed to retrieve task due to an unexpected error.")


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update a task",
    description="Updates an existing task by ID. Requires ownership or admin privileges."
)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: DBSession,
    current_user: CurrentUser
):
    """
    Updates a task.
    - **task_id**: The ID of the task to update.
    - **task_update**: Data to update the task with.
    """
    logger.info(f"User {current_user.id} attempting to update task {task_id}.")
    try:
        updated_task = await task_service.update_task(db, task_id, task_update, current_user)
        await invalidate_cache(f"cache:get_user_tasks:*user_id:{current_user.id}*") # Invalidate user's task list cache
        await invalidate_cache("cache:get_all_tasks_admin:*") # Invalidate admin's task list cache
        return updated_task
    except (NotFoundException, ForbiddenException, TaskStatusInvalidException) as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating task {task_id} for user {current_user.id}: {e}", exc_info=True)
        raise BadRequestException(detail="Failed to update task due to an unexpected error.")


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task",
    description="Deletes a task by ID. Requires ownership or admin privileges."
)
async def delete_task(
    task_id: int,
    db: DBSession,
    current_user: CurrentUser
):
    """
    Deletes a task.
    - **task_id**: The ID of the task to delete.
    """
    logger.info(f"User {current_user.id} attempting to delete task {task_id}.")
    try:
        await task_service.delete_task(db, task_id, current_user)
        await invalidate_cache(f"cache:get_user_tasks:*user_id:{current_user.id}*") # Invalidate user's task list cache
        await invalidate_cache("cache:get_all_tasks_admin:*") # Invalidate admin's task list cache
        return {} # FastAPI automatically handles 204 No Content for empty dict response
    except (NotFoundException, ForbiddenException) as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting task {task_id} for user {current_user.id}: {e}", exc_info=True)
        raise BadRequestException(detail="Failed to delete task due to an unexpected error.")

# --- Admin-only endpoints for tasks ---
@router.get(
    "/admin/all",
    response_model=List[TaskResponseWithUser],
    summary="Get all tasks (Admin only)",
    description="Retrieves a list of all tasks in the system with their owners. Requires administrator privileges."
)
@cache_response(key_prefix="cache", expiration=15) # Cache admin's task list for 15 seconds
async def get_all_tasks_admin(
    db: DBSession,
    current_admin_user: CurrentAdminUser, # Ensures only admin can access
    status: Optional[TaskStatus] = Query(None, description="Filter tasks by status"),
    user_id: Optional[int] = Query(None, description="Filter tasks by owner User ID"),
    due_date_before: Optional[datetime] = Query(None, description="Filter tasks due before this date (ISO 8601)"),
    due_date_after: Optional[datetime] = Query(None, description="Filter tasks due after this date (ISO 8601)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    """
    Returns a list of all tasks in the system, with optional filters.
    """
    logger.info(f"Admin user {current_admin_user.id} requesting all tasks.")
    tasks = await task_service.get_all_tasks_admin(
        db, status, user_id, due_date_before, due_date_after, skip, limit
    )
    return tasks
```

```