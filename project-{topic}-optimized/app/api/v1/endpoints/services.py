from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_cache.decorator import cache

from app.api.deps import get_db, get_current_active_user, get_current_active_admin
from app.crud.service import crud_service
from app.crud.metric_record import crud_metric_record
from app.schemas.service import ServiceCreate, ServiceRead, ServiceUpdate, ServiceWithLatestMetrics
from app.models.user import User
from app.core.logger import logger

router = APIRouter()


@router.get("/", response_model=List[ServiceRead])
@cache(expire=60) # Cache service list for 1 minute
async def read_services(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> List[ServiceRead]:
    """
    Retrieve services.
    """
    services = await crud_service.get_multi(db, skip=skip, limit=limit)
    return [ServiceRead.model_validate(service) for service in services]


@router.get("/with-latest-metrics", response_model=List[ServiceWithLatestMetrics])
@cache(expire=10) # Cache service list with latest metrics for 10 seconds
async def read_services_with_latest_metrics(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> List[ServiceWithLatestMetrics]:
    """
    Retrieve services with their latest metric records.
    """
    services = await crud_service.get_multi(db, skip=skip, limit=limit)
    result = []
    for service in services:
        latest_metrics = await crud_metric_record.get_latest_metrics_for_service(db, service_id=service.id)
        service_data = ServiceWithLatestMetrics.model_validate(service)
        service_data.latest_metrics = [m.to_dict() for m in latest_metrics] # convert MetricRecord objects to dicts or Pydantic schemas
        result.append(service_data)
    return result


@router.post("/", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def create_service(
    *,
    db: AsyncSession = Depends(get_db),
    service_in: ServiceCreate,
    current_user: User = Depends(get_current_active_admin), # Only admins can create services
) -> ServiceRead:
    """
    Create new service. (Admin only)
    """
    service = await crud_service.get_by_name(db, name=service_in.name)
    if service:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A service with this name already exists in the system.",
        )
    service_created = await crud_service.create(db, obj_in=service_in)
    logger.info(f"Admin {current_user.email} created new service: {service_created.name}")
    return ServiceRead.model_validate(service_created)


@router.get("/{service_id}", response_model=ServiceRead)
@cache(expire=30) # Cache individual service for 30 seconds
async def read_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ServiceRead:
    """
    Get a specific service by ID.
    """
    service = await crud_service.get(db, id=service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
        )
    return ServiceRead.model_validate(service)


@router.put("/{service_id}", response_model=ServiceRead)
async def update_service(
    *,
    db: AsyncSession = Depends(get_db),
    service_id: int,
    service_in: ServiceUpdate,
    current_user: User = Depends(get_current_active_admin), # Only admins can update services
) -> ServiceRead:
    """
    Update a service. (Admin only)
    """
    service = await crud_service.get(db, id=service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )
    if service_in.name and service_in.name != service.name:
        existing_service = await crud_service.get_by_name(db, name=service_in.name)
        if existing_service and existing_service.id != service_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A service with this name already exists in the system.",
            )
    service_updated = await crud_service.update(db, db_obj=service, obj_in=service_in)
    logger.info(f"Admin {current_user.email} updated service: {service_updated.name} (ID: {service_id})")
    return ServiceRead.model_validate(service_updated)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    *,
    db: AsyncSession = Depends(get_db),
    service_id: int,
    current_user: User = Depends(get_current_active_admin), # Only admins can delete services
) -> None:
    """
    Delete a service. (Admin only)
    """
    service = await crud_service.get(db, id=service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
        )
    await crud_service.remove(db, id=service_id)
    logger.info(f"Admin {current_user.email} deleted service with ID: {service_id}")

```

#### `app/api/v1/endpoints/metric_types.py`
```python