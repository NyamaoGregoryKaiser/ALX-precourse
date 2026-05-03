from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.schemas.project import Project as DBProject, ProjectStatus
from app.models.project import ProjectCreate, ProjectUpdate
from app.core.exceptions import NotFoundException, ConflictException
from loguru import logger

async def get_project_by_id(db: AsyncSession, project_id: int) -> Optional[DBProject]:
    """Retrieve a project by its ID, loading its owner."""
    logger.debug(f"Retrieving project with ID: {project_id}")
    result = await db.execute(
        select(DBProject)
        .options(selectinload(DBProject.owner))
        .filter(DBProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        logger.debug(f"Project with ID {project_id} not found.")
    return project

async def get_projects(
    db: AsyncSession,
    owner_id: Optional[int] = None,
    status: Optional[ProjectStatus] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[DBProject]:
    """
    Retrieve a list of projects with optional filtering by owner, status, and search.
    Includes pagination.
    """
    logger.debug(f"Retrieving projects with filters: owner_id={owner_id}, status={status}, search='{search}', skip={skip}, limit={limit}")
    query = select(DBProject).options(selectinload(DBProject.owner))

    if owner_id:
        query = query.filter(DBProject.owner_id == owner_id)
    if status:
        query = query.filter(DBProject.status == status)
    if search:
        query = query.filter(
            (DBProject.title.ilike(f"%{search}%")) |
            (DBProject.description.ilike(f"%{search}%"))
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def create_project(db: AsyncSession, project_in: ProjectCreate, owner_id: int) -> DBProject:
    """Create a new project."""
    logger.info(f"Creating new project '{project_in.title}' for owner ID: {owner_id}")
    # Optional: Check for unique project title per owner if needed
    # For simplicity, we allow same title for different projects by same owner.

    db_project = DBProject(
        title=project_in.title,
        description=project_in.description,
        status=project_in.status,
        owner_id=owner_id
    )
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    # Reload with owner to ensure relationship is populated for response
    await db.refresh(db_project, attribute_names=["owner"])
    logger.info(f"Project '{db_project.title}' (ID: {db_project.id}) created successfully by user ID {owner_id}.")
    return db_project

async def update_project(db: AsyncSession, project_id: int, project_in: ProjectUpdate) -> DBProject:
    """Update an existing project."""
    logger.info(f"Updating project with ID: {project_id}")
    db_project = await get_project_by_id(db, project_id)
    if not db_project:
        logger.warning(f"Project update failed: Project with ID {project_id} not found.")
        raise NotFoundException(detail="Project not found")

    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)

    db.add(db_project) # Mark for update
    await db.commit()
    await db.refresh(db_project)
    await db.refresh(db_project, attribute_names=["owner"]) # Refresh owner relationship
    logger.info(f"Project '{db_project.title}' (ID: {db_project.id}) updated successfully.")
    return db_project

async def delete_project(db: AsyncSession, project_id: int) -> bool:
    """Delete a project by its ID."""
    logger.info(f"Deleting project with ID: {project_id}")
    db_project = await get_project_by_id(db, project_id)
    if not db_project:
        logger.warning(f"Project deletion failed: Project with ID {project_id} not found.")
        raise NotFoundException(detail="Project not found")

    await db.delete(db_project)
    await db.commit()
    logger.info(f"Project (ID: {project_id}) deleted successfully.")
    return True
```