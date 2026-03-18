```python
import logging
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi_cache.decorator import cache
from app.core.config import settings

from app.core.exceptions import ForbiddenException, NotFoundException, BadRequestException
from app.crud.dataset import dataset as crud_dataset
from app.crud.datasource import datasource as crud_datasource
from app.dependencies import CurrentUser, DBSession
from app.schemas.dataset import Dataset, DatasetCreate, DatasetUpdate
from app.services.data_connector import data_connector

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=Dataset, status_code=status.HTTP_201_CREATED, summary="Create new dataset")
async def create_dataset(
    *,
    db: DBSession,
    dataset_in: DatasetCreate,
    current_user: CurrentUser,
) -> Dataset:
    """
    Create new dataset.
    Validates that the data source exists and is accessible by the user.
    """
    data_source = await crud_datasource.get(db, dataset_in.data_source_id)
    if not data_source:
        raise NotFoundException(detail="Data Source not found")
    if not current_user.is_superuser and data_source.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to use this data source for a dataset")

    new_dataset = await crud_dataset.create(db, obj_in=dataset_in, owner_id=current_user.id)
    return new_dataset


@router.get("/", response_model=List[Dataset], summary="Get all datasets")
async def read_datasets(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> List[Dataset]:
    """
    Retrieve datasets.
    Admins can see all, regular users only their own.
    """
    if current_user.is_superuser:
        datasets = await crud_dataset.get_multi(db, skip=skip, limit=limit)
    else:
        result = await db.execute(
            crud_dataset.model.select().filter(crud_dataset.model.owner_id == current_user.id)
            .offset(skip).limit(limit).order_by(crud_dataset.model.created_at.desc())
        )
        datasets = list(result.scalars().all())
    return datasets


@router.get("/{dataset_id}", response_model=Dataset, summary="Get dataset by ID")
async def read_dataset_by_id(
    dataset_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Dataset:
    """
    Get a specific dataset by ID.
    User must be owner or superuser.
    """
    dataset = await crud_dataset.get(db, dataset_id)
    if not dataset:
        raise NotFoundException(detail="Dataset not found")
    if not current_user.is_superuser and dataset.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to access this dataset")
    return dataset


@router.put("/{dataset_id}", response_model=Dataset, summary="Update dataset by ID")
async def update_dataset(
    *,
    db: DBSession,
    dataset_id: UUID,
    dataset_in: DatasetUpdate,
    current_user: CurrentUser,
) -> Dataset:
    """
    Update a dataset.
    User must be owner or superuser. If data_source_id is updated, validate access.
    """
    dataset = await crud_dataset.get(db, dataset_id)
    if not dataset:
        raise NotFoundException(detail="Dataset not found")
    if not current_user.is_superuser and dataset.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to modify this dataset")

    # If data_source_id is being updated, check permissions for the new data source
    if dataset_in.data_source_id and dataset_in.data_source_id != dataset.data_source_id:
        new_data_source = await crud_datasource.get(db, dataset_in.data_source_id)
        if not new_data_source:
            raise NotFoundException(detail="New Data Source not found")
        if not current_user.is_superuser and new_data_source.owner_id != current_user.id:
            raise ForbiddenException(detail="Not enough permissions to use the new data source")

    updated_dataset = await crud_dataset.update(db, db_obj=dataset, obj_in=dataset_in)
    return updated_dataset


@router.delete("/{dataset_id}", response_model=Dataset, summary="Delete dataset by ID")
async def delete_dataset(
    dataset_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Dataset:
    """
    Delete a dataset.
    User must be owner or superuser.
    """
    dataset = await crud_dataset.get(db, dataset_id)
    if not dataset:
        raise NotFoundException(detail="Dataset not found")
    if not current_user.is_superuser and dataset.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to delete this dataset")

    await crud_dataset.remove(db, id=dataset_id)
    return dataset


@router.post("/{dataset_id}/data", summary="Fetch and preview data for a dataset", response_model=List[Dict[str, Any]])
@cache(expire=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60) # Cache for 1 hour
async def get_dataset_data(
    dataset_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> List[Dict[str, Any]]:
    """
    Fetches raw data for a given dataset.
    """
    dataset = await db.execute(
        crud_dataset.model.select()
        .options(selectinload(crud_dataset.model.data_source)) # Eager load data_source
        .filter(crud_dataset.model.id == dataset_id)
    )
    dataset = dataset.scalars().first()

    if not dataset or not dataset.data_source:
        raise NotFoundException(detail="Dataset or its associated Data Source not found")
    if not current_user.is_superuser and dataset.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to access this dataset's data")

    try:
        data = await data_connector.fetch_data(
            data_source=dataset.data_source,
            query=dataset.query_string,
            parameters=dataset.parameters,
        )
        return data
    except BadRequestException as e:
        raise e
    except Exception as e:
        logger.error(f"Error fetching dataset data: {e}")
        raise BadRequestException(detail=f"Failed to fetch data: {e}")
```