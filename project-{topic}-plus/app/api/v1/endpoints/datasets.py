import json
from typing import Any, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import invalidate_cache, set_cache, get_cache
from app.core.deps import get_db, get_current_active_user, get_current_active_superuser
from app.core.errors import DuplicateEntryException, NotFoundException, ForbiddenException
from app.crud.dataset import crud_dataset
from app.schemas.dataset import Dataset, DatasetCreate, DatasetUpdate
from app.models.user import User as DBUser

router = APIRouter()

DATASET_CACHE_TTL = 300 # 5 minutes

@router.get("/", response_model=List[Dataset], summary="Retrieve all datasets")
async def read_datasets(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve all datasets.
    Users can see all datasets, superusers can manage all.
    """
    cache_key = f"datasets:all:{skip}:{limit}"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return json.loads(cached_data)

    datasets = await crud_dataset.get_multi(db, skip=skip, limit=limit)
    await set_cache(cache_key, json.dumps([dataset.model_dump() for dataset in datasets]), DATASET_CACHE_TTL)
    return datasets

@router.post("/", response_model=Dataset, status_code=status.HTTP_201_CREATED, summary="Create a new dataset")
async def create_dataset(
    *,
    db: AsyncSession = Depends(get_db),
    dataset_in: DatasetCreate,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Create new dataset.
    """
    existing_dataset = await crud_dataset.get_by_name(db, name=dataset_in.name)
    if existing_dataset:
        raise DuplicateEntryException(detail=f"Dataset with name '{dataset_in.name}' already exists.")

    dataset = await crud_dataset.create_with_owner(db, obj_in=dataset_in, owner_id=current_user.id)
    await invalidate_cache("datasets:all:*") # Invalidate all dataset list caches
    return dataset

@router.get("/{dataset_id}", response_model=Dataset, summary="Retrieve a dataset by ID")
async def read_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific dataset by ID.
    """
    cache_key = f"datasets:{dataset_id}"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return json.loads(cached_data)

    dataset = await crud_dataset.get(db, id=dataset_id)
    if not dataset:
        raise NotFoundException(detail="Dataset not found")
    
    await set_cache(cache_key, json.dumps(dataset.model_dump()), DATASET_CACHE_TTL)
    return dataset

@router.put("/{dataset_id}", response_model=Dataset, summary="Update a dataset by ID")
async def update_dataset(
    *,
    db: AsyncSession = Depends(get_db),
    dataset_id: int,
    dataset_in: DatasetUpdate,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Update a dataset. Only the owner or a superuser can update it.
    """
    dataset = await crud_dataset.get(db, id=dataset_id)
    if not dataset:
        raise NotFoundException(detail="Dataset not found")
    if not current_user.is_superuser and dataset.uploaded_by_id != current_user.id:
        raise ForbiddenException(detail="Not enough privileges to update this dataset.")

    # Check for duplicate name if name is being updated
    if dataset_in.name and dataset_in.name != dataset.name:
        existing_dataset = await crud_dataset.get_by_name(db, name=dataset_in.name)
        if existing_dataset and existing_dataset.id != dataset_id:
            raise DuplicateEntryException(detail=f"Dataset with name '{dataset_in.name}' already exists.")

    dataset = await crud_dataset.update(db, db_obj=dataset, obj_in=dataset_in)
    await invalidate_cache(f"datasets:{dataset_id}")
    await invalidate_cache("datasets:all:*") # Invalidate all dataset list caches
    return dataset

@router.delete("/{dataset_id}", response_model=Dataset, summary="Delete a dataset by ID")
async def delete_dataset(
    *,
    db: AsyncSession = Depends(get_db),
    dataset_id: int,
    current_user: DBUser = Depends(get_current_active_superuser), # Only superusers can delete
) -> Any:
    """
    Delete a dataset. Only superusers can delete datasets.
    """
    dataset = await crud_dataset.get(db, id=dataset_id)
    if not dataset:
        raise NotFoundException(detail="Dataset not found")
    
    # Although only superuser, keep for clarity/future role changes
    if not current_user.is_superuser and dataset.uploaded_by_id != current_user.id:
        raise ForbiddenException(detail="Not enough privileges to delete this dataset.")

    dataset = await crud_dataset.remove(db, id=dataset_id)
    await invalidate_cache(f"datasets:{dataset_id}")
    await invalidate_cache("datasets:all:*") # Invalidate all dataset list caches
    return dataset