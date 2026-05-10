from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_cache.decorator import cache

from app.api.deps import get_db, get_current_active_user, get_current_active_admin
from app.crud.metric_type import crud_metric_type
from app.schemas.metric_type import MetricTypeCreate, MetricTypeRead, MetricTypeUpdate
from app.models.user import User
from app.core.logger import logger

router = APIRouter()


@router.get("/", response_model=List[MetricTypeRead])
@cache(expire=300) # Cache metric type list for 5 minutes as it changes infrequently
async def read_metric_types(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> List[MetricTypeRead]:
    """
    Retrieve metric types.
    """
    metric_types = await crud_metric_type.get_multi(db, skip=skip, limit=limit)
    return [MetricTypeRead.model_validate(mt) for mt in metric_types]


@router.post("/", response_model=MetricTypeRead, status_code=status.HTTP_201_CREATED)
async def create_metric_type(
    *,
    db: AsyncSession = Depends(get_db),
    metric_type_in: MetricTypeCreate,
    current_user: User = Depends(get_current_active_admin), # Only admins can create metric types
) -> MetricTypeRead:
    """
    Create new metric type. (Admin only)
    """
    metric_type = await crud_metric_type.get_by_name(db, name=metric_type_in.name)
    if metric_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A metric type with this name already exists in the system.",
        )
    metric_type_created = await crud_metric_type.create(db, obj_in=metric_type_in)
    logger.info(f"Admin {current_user.email} created new metric type: {metric_type_created.name}")
    return MetricTypeRead.model_validate(metric_type_created)


@router.get("/{metric_type_id}", response_model=MetricTypeRead)
@cache(expire=300) # Cache individual metric type for 5 minutes
async def read_metric_type(
    metric_type_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MetricTypeRead:
    """
    Get a specific metric type by ID.
    """
    metric_type = await crud_metric_type.get(db, id=metric_type_id)
    if not metric_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Metric type not found"
        )
    return MetricTypeRead.model_validate(metric_type)


@router.put("/{metric_type_id}", response_model=MetricTypeRead)
async def update_metric_type(
    *,
    db: AsyncSession = Depends(get_db),
    metric_type_id: int,
    metric_type_in: MetricTypeUpdate,
    current_user: User = Depends(get_current_active_admin), # Only admins can update metric types
) -> MetricTypeRead:
    """
    Update a metric type. (Admin only)
    """
    metric_type = await crud_metric_type.get(db, id=metric_type_id)
    if not metric_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric type not found",
        )
    if metric_type_in.name and metric_type_in.name != metric_type.name:
        existing_metric_type = await crud_metric_type.get_by_name(db, name=metric_type_in.name)
        if existing_metric_type and existing_metric_type.id != metric_type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A metric type with this name already exists in the system.",
            )
    metric_type_updated = await crud_metric_type.update(db, db_obj=metric_type, obj_in=metric_type_in)
    logger.info(f"Admin {current_user.email} updated metric type: {metric_type_updated.name} (ID: {metric_type_id})")
    return MetricTypeRead.model_validate(metric_type_updated)


@router.delete("/{metric_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric_type(
    *,
    db: AsyncSession = Depends(get_db),
    metric_type_id: int,
    current_user: User = Depends(get_current_active_admin), # Only admins can delete metric types
) -> None:
    """
    Delete a metric type. (Admin only)
    """
    metric_type = await crud_metric_type.get(db, id=metric_type_id)
    if not metric_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Metric type not found"
        )
    await crud_metric_type.remove(db, id=metric_type_id)
    logger.info(f"Admin {current_user.email} deleted metric type with ID: {metric_type_id}")
```

#### `app/api/v1/endpoints/metric_records.py`
```python