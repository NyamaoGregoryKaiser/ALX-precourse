import json
from typing import Any, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import invalidate_cache, set_cache, get_cache
from app.core.deps import get_db, get_current_active_user, get_current_active_superuser
from app.core.errors import DuplicateEntryException, NotFoundException, ForbiddenException
from app.crud.model import crud_ml_model
from app.schemas.model import MLModel, MLModelCreate, MLModelUpdate
from app.models.user import User as DBUser

router = APIRouter()

MODEL_CACHE_TTL = 300 # 5 minutes

@router.get("/", response_model=List[MLModel], summary="Retrieve all ML Models")
async def read_models(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve all registered ML models.
    Users can see all models, superusers can manage all.
    """
    cache_key = f"models:all:{skip}:{limit}"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return json.loads(cached_data)

    models = await crud_ml_model.get_multi(db, skip=skip, limit=limit)
    await set_cache(cache_key, json.dumps([model.model_dump() for model in models]), MODEL_CACHE_TTL)
    return models

@router.post("/", response_model=MLModel, status_code=status.HTTP_201_CREATED, summary="Register a new ML Model")
async def create_model(
    *,
    db: AsyncSession = Depends(get_db),
    model_in: MLModelCreate,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Register a new ML model.
    """
    existing_model = await crud_ml_model.get_by_name_and_version(db, name=model_in.name, version=model_in.version)
    if existing_model:
        raise DuplicateEntryException(detail=f"Model '{model_in.name}' with version '{model_in.version}' already exists.")

    model = await crud_ml_model.create_with_owner(db, obj_in=model_in, owner_id=current_user.id)
    await invalidate_cache("models:all:*") # Invalidate all model list caches
    return model

@router.get("/{model_id}", response_model=MLModel, summary="Retrieve an ML Model by ID")
async def read_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific ML model by ID.
    """
    cache_key = f"models:{model_id}"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return json.loads(cached_data)

    model = await crud_ml_model.get(db, id=model_id)
    if not model:
        raise NotFoundException(detail="ML Model not found")
    
    await set_cache(cache_key, json.dumps(model.model_dump()), MODEL_CACHE_TTL)
    return model

@router.put("/{model_id}", response_model=MLModel, summary="Update an ML Model by ID")
async def update_model(
    *,
    db: AsyncSession = Depends(get_db),
    model_id: int,
    model_in: MLModelUpdate,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Update an ML model. Only the registrant or a superuser can update it.
    """
    model = await crud_ml_model.get(db, id=model_id)
    if not model:
        raise NotFoundException(detail="ML Model not found")
    if not current_user.is_superuser and model.registered_by_id != current_user.id:
        raise ForbiddenException(detail="Not enough privileges to update this model.")

    # Check for duplicate name/version if name or version is being updated
    if (model_in.name and model_in.name != model.name) or \
       (model_in.version and model_in.version != model.version):
        name_to_check = model_in.name or model.name
        version_to_check = model_in.version or model.version
        existing_model = await crud_ml_model.get_by_name_and_version(db, name=name_to_check, version=version_to_check)
        if existing_model and existing_model.id != model_id:
            raise DuplicateEntryException(detail=f"Model '{name_to_check}' with version '{version_to_check}' already exists.")

    model = await crud_ml_model.update(db, db_obj=model, obj_in=model_in)
    await invalidate_cache(f"models:{model_id}")
    await invalidate_cache("models:all:*") # Invalidate all model list caches
    return model

@router.delete("/{model_id}", response_model=MLModel, summary="Delete an ML Model by ID")
async def delete_model(
    *,
    db: AsyncSession = Depends(get_db),
    model_id: int,
    current_user: DBUser = Depends(get_current_active_superuser), # Only superusers can delete
) -> Any:
    """
    Delete an ML model. Only superusers can delete models.
    """
    model = await crud_ml_model.get(db, id=model_id)
    if not model:
        raise NotFoundException(detail="ML Model not found")

    # Although only superuser, keep for clarity/future role changes
    if not current_user.is_superuser and model.registered_by_id != current_user.id:
        raise ForbiddenException(detail="Not enough privileges to delete this model.")

    model = await crud_ml_model.remove(db, id=model_id)
    await invalidate_cache(f"models:{model_id}")
    await invalidate_cache("models:all:*") # Invalidate all model list caches
    return model