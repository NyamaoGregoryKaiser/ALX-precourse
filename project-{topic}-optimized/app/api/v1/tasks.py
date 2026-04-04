from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.crud.task import task as crud_task
from app.crud.project import project as crud_project
from app.crud.user import user as crud_user
from app.core.dependencies import get_db, get_current_user
from app.schemas.task import Task as TaskSchema, TaskCreate, TaskUpdate
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.schemas.msg import Message

router = APIRouter()

@router.get("/", response_model=List[TaskSchema])
async def read_tasks(
    db: AsyncSession = Depends(get_db),
    project_id: Optional[UUID] = None,
    assignee_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve tasks.
    Filtered by project_id or assignee_id (must be relevant to current user).
    If no filter, returns tasks assigned to the current user.
    """
    if project_id:
        project = await crud_project.get(db, id=project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        # Ensure user has access to the project
        if not current_user.is_superuser and project.owner_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to view tasks in this project")
        tasks = await crud_task.get_multi_by_project(db, project_id=project_id, skip=skip, limit=limit)
    elif assignee_id:
        # User can only view tasks assigned to themselves, unless superuser
        if not current_user.is_superuser and assignee_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view tasks assigned to other users")
        tasks = await crud_task.get_multi_by_assignee(db, assignee_id=assignee_id, skip=skip, limit=limit)
    else:
        # Default to tasks assigned to the current user
        tasks = await crud_task.get_multi_by_assignee(db, assignee_id=current_user.id, skip=skip, limit=limit)
    
    return tasks

@router.post("/", response_model=TaskSchema, status_code=status.HTTP_201_CREATED)
async def create_task(
    *,
    db: AsyncSession = Depends(get_db),
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new task.
    """
    # Ensure project exists and belongs to the current user
    project = await crud_project.get(db, id=task_in.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_superuser and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create tasks in this project")
    
    # Optionally check if assignee exists
    if task_in.assignee_id:
        assignee = await crud_user.get(db, id=task_in.assignee_id)
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee user not found")

    task = await crud_task.create(db, obj_in=task_in)
    return task

@router.get("/{task_id}", response_model=TaskSchema)
async def read_task(
    *,
    db: AsyncSession = Depends(get_db),
    task_id: UUID,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get task by ID.
    """
    task = await crud_task.get_with_project_and_assignee(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Authorization check:
    # 1. Superuser can view any task
    # 2. Project owner can view tasks in their project
    # 3. Assignee can view tasks assigned to them
    is_project_owner = task.project and task.project.owner_id == current_user.id
    is_assignee = task.assignee_id == current_user.id
    
    if not current_user.is_superuser and not (is_project_owner or is_assignee):
        raise HTTPException(status_code=403, detail="Not authorized to view this task")
    
    return task

@router.put("/{task_id}", response_model=TaskSchema)
async def update_task(
    *,
    db: AsyncSession = Depends(get_db),
    task_id: UUID,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update a task.
    """
    task = await crud_task.get_with_project_and_assignee(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Authorization check for updates:
    # 1. Superuser can update any task
    # 2. Project owner can update tasks in their project
    # 3. Assignee can update task *status* (and potentially description) for tasks assigned to them
    is_project_owner = task.project and task.project.owner_id == current_user.id
    is_assignee = task.assignee_id == current_user.id

    if not current_user.is_superuser:
        if not is_project_owner and not is_assignee:
            raise HTTPException(status_code=403, detail="Not authorized to update this task")
        
        # If not project owner, only assignee can change status and description
        if not is_project_owner:
            if not is_assignee:
                raise HTTPException(status_code=403, detail="Not authorized to update this task")
            # If assignee, they can only update status and description
            if task_in.title is not None and task_in.title != task.title:
                raise HTTPException(status_code=403, detail="Assignees can only update task status and description.")
            if task_in.project_id is not None and task_in.project_id != task.project_id:
                 raise HTTPException(status_code=403, detail="Assignees cannot change the project of a task.")
            if task_in.assignee_id is not None and task_in.assignee_id != task.assignee_id:
                raise HTTPException(status_code=403, detail="Assignees cannot reassign tasks.")
            if task_in.due_date is not None and task_in.due_date != task.due_date:
                raise HTTPException(status_code=403, detail="Assignees cannot change due date of tasks.")

    # If project_id is being changed, verify new project and user's access
    if task_in.project_id and task_in.project_id != task.project_id:
        new_project = await crud_project.get(db, id=task_in.project_id)
        if not new_project:
            raise HTTPException(status_code=404, detail="New project not found")
        if not current_user.is_superuser and new_project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to move task to this project")
    
    # If assignee_id is being changed, verify new assignee exists
    if task_in.assignee_id and task_in.assignee_id != task.assignee_id:
        new_assignee = await crud_user.get(db, id=task_in.assignee_id)
        if not new_assignee:
            raise HTTPException(status_code=404, detail="New assignee user not found")

    task = await crud_task.update(db, db_obj=task, obj_in=task_in)
    return task

@router.delete("/{task_id}", response_model=Message)
async def delete_task(
    *,
    db: AsyncSession = Depends(get_db),
    task_id: UUID,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete a task.
    """
    task = await crud_task.get_with_project_and_assignee(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Authorization check: only project owner or superuser can delete
    is_project_owner = task.project and task.project.owner_id == current_user.id
    
    if not current_user.is_superuser and not is_project_owner:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")
    
    await crud_task.remove(db, id=task_id)
    return {"message": "Task deleted successfully"}
```