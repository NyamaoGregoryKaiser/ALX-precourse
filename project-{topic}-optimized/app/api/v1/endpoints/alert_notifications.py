from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user, get_current_active_admin
from app.crud.alert_notification import crud_alert_notification
from app.schemas.alert_notification import AlertNotificationRead, AlertNotificationUpdate
from app.models.user import User
from app.core.logger import logger

router = APIRouter()


@router.get("/", response_model=List[AlertNotificationRead])
async def read_alert_notifications(
    db: AsyncSession = Depends(get_db),
    service_id: Optional[int] = Query(None, description="Filter by service ID"),
    alert_rule_id: Optional[int] = Query(None, description="Filter by alert rule ID"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    start_time: Optional[datetime] = Query(None, description="Filter notifications from this time (inclusive)"),
    end_time: Optional[datetime] = Query(None, description="Filter notifications until this time (inclusive)"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> List[AlertNotificationRead]:
    """
    Retrieve alert notifications, with optional filtering.
    """
    filters = {}
    if service_id is not None:
        filters["service_id"] = service_id
    if alert_rule_id is not None:
        filters["alert_rule_id"] = alert_rule_id
    if is_resolved is not None:
        filters["is_resolved"] = is_resolved
    if start_time:
        filters["triggered_at_ge"] = start_time
    if end_time:
        filters["triggered_at_le"] = end_time

    notifications = await crud_alert_notification.get_multi_filtered(
        db, filters=filters, skip=skip, limit=limit, order_by="triggered_at_desc"
    )
    return [AlertNotificationRead.model_validate(an) for an in notifications]


@router.get("/{notification_id}", response_model=AlertNotificationRead)
async def read_alert_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AlertNotificationRead:
    """
    Get a specific alert notification by ID.
    """
    notification = await crud_alert_notification.get(db, id=notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert notification not found"
        )
    return AlertNotificationRead.model_validate(notification)


@router.put("/{notification_id}", response_model=AlertNotificationRead)
async def update_alert_notification(
    *,
    db: AsyncSession = Depends(get_db),
    notification_id: int,
    notification_in: AlertNotificationUpdate,
    current_user: User = Depends(get_current_active_admin), # Only admins can update (resolve) notifications
) -> AlertNotificationRead:
    """
    Update an alert notification (e.g., mark as resolved). (Admin only)
    """
    notification = await crud_alert_notification.get(db, id=notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert notification not found",
        )
    notification_updated = await crud_alert_notification.update(db, db_obj=notification, obj_in=notification_in)
    logger.info(f"Admin {current_user.email} updated alert notification ID: {notification_id}. Resolved: {notification_updated.is_resolved}")
    return AlertNotificationRead.model_validate(notification_updated)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_notification(
    *,
    db: AsyncSession = Depends(get_db),
    notification_id: int,
    current_user: User = Depends(get_current_active_admin), # Only admins can delete notifications
) -> None:
    """
    Delete an alert notification. (Admin only)
    """
    notification = await crud_alert_notification.get(db, id=notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert notification not found"
        )
    await crud_alert_notification.remove(db, id=notification_id)
    logger.info(f"Admin {current_user.email} deleted alert notification with ID: {notification_id}")
```

#### `app/api/deps.py` (Dependencies for API)
```python