from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Project, ProjectCreate, ProjectUpdate, ProjectListItem
from app.schemas.project import Project as DBProject, ProjectStatus
from app.schemas.user import User as DBUser, UserRole
from app.crud import projects as crud_projects
from app.dependencies.common import get_async_db_session, get_current_user_dependency, get_current_manager_dependency, get_current_admin_dependency
from app.core.exceptions import NotFoundException, ConflictException, ForbiddenException
from loguru import logger

router = APIRouter()

@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED, summary="Create a new project")
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_manager_dependency) # Managers or Admins can create projects
):
    """
    Create a new project. The current authenticated user will be set as the project owner.
    **Requires manager or admin privileges.**
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) attempting to create project: {project_in.title}")
    try:
        project = await crud_projects.create_project(db, project_in, owner_id=current_user.id)
        return project
    except Exception as e:
        logger.error(f"Error creating project {project_in.title} for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/", response_model=List[ProjectListItem], summary="Retrieve multiple projects")
async def read_projects(
    status: Optional[ProjectStatus] = Query(None, description="Filter projects by status"),
    owner_id: Optional[int] = Query(None, description="Filter projects by owner ID (admin/manager only)"),
    search: Optional[str] = Query(None, description="Search projects by title or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency)
):
    """
    Retrieve multiple projects with pagination and optional filtering.
    - Regular users can only see projects they own.
    - Managers can see all projects.
    - Admins can see all projects and filter by owner_id.
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) retrieving projects.")
    
    filter_owner_id = None
    if current_user.role == UserRole.MEMBER:
        # Members can only see their own projects
        if owner_id is not None and owner_id != current_user.id:
            logger.warning(f"Member user {current_user.id} attempted to view projects of owner_id {owner_id}.")
            raise ForbiddenException(detail="You can only view your own projects.")
        filter_owner_id = current_user.id
    elif current_user.role == UserRole.MANAGER:
        # Managers can see all projects, but cannot filter by owner_id explicitly
        # They can still filter by status or search
        if owner_id is not None:
             raise ForbiddenException(detail="Managers cannot filter by specific owner_id.")
        # No specific owner_id filter for managers by default, they see all
        pass
    elif current_user.role == UserRole.ADMIN:
        # Admins can see all projects and filter by owner_id
        filter_owner_id = owner_id # If owner_id is None, it won't filter

    projects = await crud_projects.get_projects(
        db,
        owner_id=filter_owner_id,
        status=status,
        search=search,
        skip=skip,
        limit=limit
    )
    return projects

@router.get("/{project_id}", response_model=Project, summary="Retrieve a project by ID")
async def read_project(
    project_id: int,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency)
):
    """
    Retrieve a specific project by its ID.
    - Users can only view projects they own.
    - Managers/Admins can view any project.
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) retrieving project with ID: {project_id}")
    project = await crud_projects.get_project_by_id(db, project_id)
    if not project:
        logger.warning(f"Project {project_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Authorization check
    if current_user.role == UserRole.MEMBER and project.owner_id != current_user.id:
        logger.warning(f"Member user {current_user.id} attempted to access project {project_id} owned by {project.owner_id}.")
        raise ForbiddenException(detail="You do not have permission to access this project.")

    return project

@router.put("/{project_id}", response_model=Project, summary="Update a project by ID")
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_manager_dependency) # Managers or Admins can update projects
):
    """
    Update an existing project by its ID.
    - Managers can update any project.
    - Admins can update any project.
    **Requires manager or admin privileges.**
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) attempting to update project with ID: {project_id}")
    existing_project = await crud_projects.get_project_by_id(db, project_id)
    if not existing_project:
        logger.warning(f"Project {project_id} not found for update.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Authorization check: Managers/Admins can update, but must ensure project exists.
    # No further owner-specific check needed for managers/admins based on rule.
    try:
        updated_project = await crud_projects.update_project(db, project_id, project_in)
        return updated_project
    except NotFoundException as e: # This should be caught by the initial check, but defensive
        logger.warning(f"Project update failed: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating project {project_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a project by ID")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_manager_dependency) # Managers or Admins can delete projects
):
    """
    Delete a project by its ID.
    - Managers can delete any project.
    - Admins can delete any project.
    **Requires manager or admin privileges.**
    """
    logger.info(f"User {current_user.id} (Role: {current_user.role}) attempting to delete project with ID: {project_id}")
    existing_project = await crud_projects.get_project_by_id(db, project_id)
    if not existing_project:
        logger.warning(f"Project {project_id} not found for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    try:
        success = await crud_projects.delete_project(db, project_id)
        if not success: # Defensive, crud handles NotFound
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return # 204 No Content
    except NotFoundException as e:
        logger.warning(f"Project deletion failed: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting project {project_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
```