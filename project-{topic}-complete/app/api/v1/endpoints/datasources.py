```python
import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ForbiddenException
from app.crud.datasource import datasource as crud_datasource
from app.crud.user import user as crud_user
from app.dependencies import CurrentUser, CurrentSuperUser, DBSession
from app.schemas.datasource import DataSource, DataSourceCreate, DataSourceUpdate
from app.services.data_connector import data_connector

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=DataSource, status_code=status.HTTP_201_CREATED, summary="Create new data source")
async def create_data_source(
    *,
    db: DBSession,
    data_source_in: DataSourceCreate,
    current_user: CurrentUser,
) -> DataSource:
    """
    Create new data source.
    """
    new_data_source = await crud_datasource.create(db, obj_in=data_source_in, owner_id=current_user.id)
    return new_data_source


@router.get("/", response_model=List[DataSource], summary="Get all data sources")
async def read_data_sources(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> List[DataSource]:
    """
    Retrieve data sources.
    Admins can see all, regular users only their own.
    """
    if current_user.is_superuser:
        data_sources = await crud_datasource.get_multi(db, skip=skip, limit=limit)
    else:
        # Filter by owner_id for non-superusers
        result = await db.execute(
            crud_datasource.model.select().filter(crud_datasource.model.owner_id == current_user.id)
            .offset(skip).limit(limit).order_by(crud_datasource.model.created_at.desc())
        )
        data_sources = list(result.scalars().all())
    return data_sources


@router.get("/{data_source_id}", response_model=DataSource, summary="Get data source by ID")
async def read_data_source_by_id(
    data_source_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> DataSource:
    """
    Get a specific data source by ID.
    User must be owner or superuser.
    """
    data_source = await crud_datasource.get(db, data_source_id)
    if not data_source:
        raise NotFoundException(detail="Data Source not found")
    if not current_user.is_superuser and data_source.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to access this data source")
    return data_source


@router.put("/{data_source_id}", response_model=DataSource, summary="Update data source by ID")
async def update_data_source(
    *,
    db: DBSession,
    data_source_id: UUID,
    data_source_in: DataSourceUpdate,
    current_user: CurrentUser,
) -> DataSource:
    """
    Update a data source.
    User must be owner or superuser.
    """
    data_source = await crud_datasource.get(db, data_source_id)
    if not data_source:
        raise NotFoundException(detail="Data Source not found")
    if not current_user.is_superuser and data_source.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to modify this data source")

    updated_data_source = await crud_datasource.update(db, db_obj=data_source, obj_in=data_source_in)
    return updated_data_source


@router.delete("/{data_source_id}", response_model=DataSource, summary="Delete data source by ID")
async def delete_data_source(
    data_source_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> DataSource:
    """
    Delete a data source.
    User must be owner or superuser.
    """
    data_source = await crud_datasource.get(db, data_source_id)
    if not data_source:
        raise NotFoundException(detail="Data Source not found")
    if not current_user.is_superuser and data_source.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to delete this data source")

    await crud_datasource.remove(db, id=data_source_id)
    return data_source


@router.post("/{data_source_id}/test", summary="Test connection for a data source")
async def test_data_source_connection(
    data_source_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> dict[str, bool]:
    """
    Test the connection to a specified data source.
    User must be owner or superuser.
    """
    data_source = await crud_datasource.get(db, data_source_id)
    if not data_source:
        raise NotFoundException(detail="Data Source not found")
    if not current_user.is_superuser and data_source.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to test this data source")

    is_connected = await data_connector.test_connection(data_source)
    return {"connected": is_connected}
```