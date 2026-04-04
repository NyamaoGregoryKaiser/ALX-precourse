from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.project import project as crud_project
from app.core.dependencies import get_db, get_current_user
from app.schemas.project import Project as ProjectSchema, ProjectCreate, ProjectUpdate
from app.models.user import User
from app.models.project import Project
from app.schemas.msg import Message

router = APIRouter()

@router.get("/", response_model=List[ProjectSchema])
async def read_projects(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve projects created by the current user.
    """
    projects = await crud_project.get_multi_by_owner(
        db, owner_id=current_user.id, skip=skip, limit=limit
    )
    return projects

@router.post("/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new project.
    """
    project = await crud_project.create_with_owner(
        db, obj_in=project_in, owner_id=current_user.id
    )
    return project

@router.get("/{project_id}", response_model=ProjectSchema)
async def read_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get project by ID.
    """
    project = await db.execute(
        select(Project)
        .options(selectinload(Project.owner))
        .filter(Project.id == project_id)
    )
    project = project.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_superuser and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this project")
    return project

@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update a project.
    """
    project = await crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_superuser and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this project")
    
    project = await crud_project.update(db, db_obj=project, obj_in=project_in)
    return project

@router.delete("/{project_id}", response_model=Message)
async def delete_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete a project.
    """
    project = await crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_superuser and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    await crud_project.remove(db, id=project_id)
    return {"message": "Project deleted successfully"}
```