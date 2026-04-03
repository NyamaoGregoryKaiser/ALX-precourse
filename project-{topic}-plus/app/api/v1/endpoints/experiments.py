import json
from typing import Any, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import invalidate_cache, set_cache, get_cache
from app.core.deps import get_db, get_current_active_user, get_current_active_superuser
from app.core.errors import DuplicateEntryException, NotFoundException, ForbiddenException
from app.crud.experiment import crud_experiment
from app.schemas.experiment import Experiment, ExperimentCreate, ExperimentUpdate
from app.models.user import User as DBUser

router = APIRouter()

EXPERIMENT_CACHE_TTL = 300 # 5 minutes

@router.get("/", response_model=List[Experiment], summary="Retrieve all experiments")
async def read_experiments(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve all experiments.
    Users can see all experiments, superusers can manage all.
    """
    cache_key = f"experiments:all:{skip}:{limit}"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return json.loads(cached_data)

    experiments = await crud_experiment.get_multi(db, skip=skip, limit=limit)
    await set_cache(cache_key, json.dumps([exp.model_dump() for exp in experiments]), EXPERIMENT_CACHE_TTL)
    return experiments

@router.post("/", response_model=Experiment, status_code=status.HTTP_201_CREATED, summary="Create a new experiment run")
async def create_experiment(
    *,
    db: AsyncSession = Depends(get_db),
    experiment_in: ExperimentCreate,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Create a new experiment run.
    """
    existing_experiment = await crud_experiment.get_by_run_id(db, run_id=experiment_in.run_id)
    if existing_experiment:
        raise DuplicateEntryException(detail=f"Experiment with run_id '{experiment_in.run_id}' already exists.")

    experiment = await crud_experiment.create_with_owner(db, obj_in=experiment_in, owner_id=current_user.id)
    await invalidate_cache("experiments:all:*") # Invalidate all experiment list caches
    return experiment

@router.get("/{experiment_id}", response_model=Experiment, summary="Retrieve an experiment by ID")
async def read_experiment(
    experiment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific experiment by ID.
    """
    cache_key = f"experiments:{experiment_id}"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return json.loads(cached_data)

    experiment = await crud_experiment.get(db, id=experiment_id)
    if not experiment:
        raise NotFoundException(detail="Experiment not found")
    
    await set_cache(cache_key, json.dumps(experiment.model_dump()), EXPERIMENT_CACHE_TTL)
    return experiment

@router.put("/{experiment_id}", response_model=Experiment, summary="Update an experiment by ID")
async def update_experiment(
    *,
    db: AsyncSession = Depends(get_db),
    experiment_id: int,
    experiment_in: ExperimentUpdate,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Update an experiment. Only the creator or a superuser can update it.
    """
    experiment = await crud_experiment.get(db, id=experiment_id)
    if not experiment:
        raise NotFoundException(detail="Experiment not found")
    if not current_user.is_superuser and experiment.created_by_id != current_user.id:
        raise ForbiddenException(detail="Not enough privileges to update this experiment.")

    experiment = await crud_experiment.update(db, db_obj=experiment, obj_in=experiment_in)
    await invalidate_cache(f"experiments:{experiment_id}")
    await invalidate_cache("experiments:all:*") # Invalidate all experiment list caches
    return experiment

@router.delete("/{experiment_id}", response_model=Experiment, summary="Delete an experiment by ID")
async def delete_experiment(
    *,
    db: AsyncSession = Depends(get_db),
    experiment_id: int,
    current_user: DBUser = Depends(get_current_active_superuser), # Only superusers can delete
) -> Any:
    """
    Delete an experiment. Only superusers can delete experiments.
    """
    experiment = await crud_experiment.get(db, id=experiment_id)
    if not experiment:
        raise NotFoundException(detail="Experiment not found")

    # Although only superuser, keep for clarity/future role changes
    if not current_user.is_superuser and experiment.created_by_id != current_user.id:
        raise ForbiddenException(detail="Not enough privileges to delete this experiment.")

    experiment = await crud_experiment.remove(db, id=experiment_id)
    await invalidate_cache(f"experiments:{experiment_id}")
    await invalidate_cache("experiments:all:*") # Invalidate all experiment list caches
    return experiment