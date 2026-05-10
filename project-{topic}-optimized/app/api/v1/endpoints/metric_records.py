from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_limiter.annotations import rate_limit

from app.api.deps import get_db, get_current_active_user
from app.crud.metric_record import crud_metric_record
from app.crud.service import crud_service
from app.crud.metric_type import crud_metric_type
from app.schemas.metric_record import MetricRecordCreate, MetricRecordRead
from app.models.user import User
from app.core.logger import logger
from app.core.exceptions import ServiceNotFoundException, MetricTypeNotFoundException

router = APIRouter()


@router.post("/", response_model=MetricRecordRead, status_code=status.HTTP_201_CREATED)
@rate_limit(times=10, seconds=5) # Limit to 10 requests every 5 seconds per client
async def create_metric_record(
    *,
    db: AsyncSession = Depends(get_db),
    metric_record_in: MetricRecordCreate,
    current_user: User = Depends(get_current_active_user), # Requires authentication to submit metrics
) -> MetricRecordRead:
    """
    Create a new metric record for a service.
    """
    service = await crud_service.get(db, id=metric_record_in.service_id)
    if not service:
        raise ServiceNotFoundException(detail=f"Service with ID {metric_record_in.service_id} not found.")

    metric_type = await crud_metric_type.get(db, id=metric_record_in.metric_type_id)
    if not metric_type:
        raise MetricTypeNotFoundException(detail=f"Metric type with ID {metric_record_in.metric_type_id} not found.")

    metric_record_created = await crud_metric_record.create(db, obj_in=metric_record_in)
    logger.debug(f"User {current_user.email} submitted metric for service {service.name} ({metric_type.name}): {metric_record_in.value}")
    return MetricRecordRead.model_validate(metric_record_created)


@router.get("/", response_model=List[MetricRecordRead])
async def read_metric_records(
    db: AsyncSession = Depends(get_db),
    service_id: Optional[int] = Query(None, description="Filter by service ID"),
    metric_type_id: Optional[int] = Query(None, description="Filter by metric type ID"),
    start_time: Optional[datetime] = Query(None, description="Filter records from this time (inclusive)"),
    end_time: Optional[datetime] = Query(None, description="Filter records until this time (inclusive)"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> List[MetricRecordRead]:
    """
    Retrieve metric records, with optional filtering by service, metric type, and time range.
    """
    filters = {}
    if service_id:
        filters["service_id"] = service_id
    if metric_type_id:
        filters["metric_type_id"] = metric_type_id
    if start_time:
        filters["timestamp_ge"] = start_time
    if end_time:
        filters["timestamp_le"] = end_time

    metric_records = await crud_metric_record.get_multi_filtered(
        db, filters=filters, skip=skip, limit=limit
    )
    return [MetricRecordRead.model_validate(mr) for mr in metric_records]


@router.get("/service/{service_id}/latest", response_model=List[MetricRecordRead])
async def get_latest_metrics_for_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[MetricRecordRead]:
    """
    Retrieve the latest metric record for each metric type for a given service.
    """
    service = await crud_service.get(db, id=service_id)
    if not service:
        raise ServiceNotFoundException(detail=f"Service with ID {service_id} not found.")

    latest_metrics = await crud_metric_record.get_latest_metrics_for_service(db, service_id=service_id)
    return [MetricRecordRead.model_validate(mr) for mr in latest_metrics]


@router.get("/service/{service_id}/type/{metric_type_id}/history", response_model=List[MetricRecordRead])
async def get_metric_history_for_service_type(
    service_id: int,
    metric_type_id: int,
    db: AsyncSession = Depends(get_db),
    period_hours: int = Query(24, description="Number of hours to retrieve history for"),
    current_user: User = Depends(get_current_active_user),
) -> List[MetricRecordRead]:
    """
    Retrieve historical metric records for a specific service and metric type.
    """
    service = await crud_service.get(db, id=service_id)
    if not service:
        raise ServiceNotFoundException(detail=f"Service with ID {service_id} not found.")

    metric_type = await crud_metric_type.get(db, id=metric_type_id)
    if not metric_type:
        raise MetricTypeNotFoundException(detail=f"Metric type with ID {metric_type_id} not found.")

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=period_hours)

    filters = {
        "service_id": service_id,
        "metric_type_id": metric_type_id,
        "timestamp_ge": start_time,
        "timestamp_le": end_time
    }
    history = await crud_metric_record.get_multi_filtered(db, filters=filters, order_by="timestamp_asc")
    return [MetricRecordRead.model_validate(mr) for mr in history]


@router.get("/{record_id}", response_model=MetricRecordRead)
async def read_metric_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MetricRecordRead:
    """
    Get a specific metric record by ID.
    """
    metric_record = await crud_metric_record.get(db, id=record_id)
    if not metric_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Metric record not found"
        )
    return MetricRecordRead.model_validate(metric_record)

```

#### `app/api/v1/endpoints/alert_rules.py`
```python