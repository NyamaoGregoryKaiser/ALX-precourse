from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user, get_current_active_admin
from app.crud.alert_rule import crud_alert_rule
from app.crud.service import crud_service
from app.crud.metric_type import crud_metric_type
from app.schemas.alert_rule import AlertRuleCreate, AlertRuleRead, AlertRuleUpdate
from app.models.user import User
from app.core.logger import logger
from app.core.exceptions import ServiceNotFoundException, MetricTypeNotFoundException, InvalidConditionException

router = APIRouter()


@router.post("/", response_model=AlertRuleRead, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    *,
    db: AsyncSession = Depends(get_db),
    alert_rule_in: AlertRuleCreate,
    current_user: User = Depends(get_current_active_admin), # Only admins can create alert rules
) -> AlertRuleRead:
    """
    Create a new alert rule. (Admin only)
    """
    service = await crud_service.get(db, id=alert_rule_in.service_id)
    if not service:
        raise ServiceNotFoundException(detail=f"Service with ID {alert_rule_in.service_id} not found.")

    metric_type = await crud_metric_type.get(db, id=alert_rule_in.metric_type_id)
    if not metric_type:
        raise MetricTypeNotFoundException(detail=f"Metric type with ID {alert_rule_in.metric_type_id} not found.")
    
    # Basic validation for condition string
    # For a production system, a more robust parser or a more structured condition object
    # would be preferred over direct `eval`. Here, we simulate a check.
    try:
        # Test if condition can be evaluated with a dummy value
        eval(alert_rule_in.condition.replace('value', '1.0'))
    except Exception:
        raise InvalidConditionException(detail="Invalid condition string provided. Example: 'value > 80.0'")


    alert_rule_created = await crud_alert_rule.create(db, obj_in=alert_rule_in)
    logger.info(f"Admin {current_user.email} created new alert rule for service {service.name} ({metric_type.name}): {alert_rule_created.condition}")
    return AlertRuleRead.model_validate(alert_rule_created)


@router.get("/", response_model=List[AlertRuleRead])
async def read_alert_rules(
    db: AsyncSession = Depends(get_db),
    service_id: Optional[int] = None,
    metric_type_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> List[AlertRuleRead]:
    """
    Retrieve alert rules.
    """
    filters = {}
    if service_id is not None:
        filters["service_id"] = service_id
    if metric_type_id is not None:
        filters["metric_type_id"] = metric_type_id
    if is_active is not None:
        filters["is_active"] = is_active
        
    alert_rules = await crud_alert_rule.get_multi_filtered(db, filters=filters, skip=skip, limit=limit)
    return [AlertRuleRead.model_validate(ar) for ar in alert_rules]


@router.get("/{rule_id}", response_model=AlertRuleRead)
async def read_alert_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AlertRuleRead:
    """
    Get a specific alert rule by ID.
    """
    alert_rule = await crud_alert_rule.get(db, id=rule_id)
    if not alert_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found"
        )
    return AlertRuleRead.model_validate(alert_rule)


@router.put("/{rule_id}", response_model=AlertRuleRead)
async def update_alert_rule(
    *,
    db: AsyncSession = Depends(get_db),
    rule_id: int,
    alert_rule_in: AlertRuleUpdate,
    current_user: User = Depends(get_current_active_admin), # Only admins can update alert rules
) -> AlertRuleRead:
    """
    Update an alert rule. (Admin only)
    """
    alert_rule = await crud_alert_rule.get(db, id=rule_id)
    if not alert_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert rule not found",
        )
    
    if alert_rule_in.service_id:
        service = await crud_service.get(db, id=alert_rule_in.service_id)
        if not service:
            raise ServiceNotFoundException(detail=f"Service with ID {alert_rule_in.service_id} not found.")

    if alert_rule_in.metric_type_id:
        metric_type = await crud_metric_type.get(db, id=alert_rule_in.metric_type_id)
        if not metric_type:
            raise MetricTypeNotFoundException(detail=f"Metric type with ID {alert_rule_in.metric_type_id} not found.")

    # Basic validation for condition string if provided
    if alert_rule_in.condition:
        try:
            eval(alert_rule_in.condition.replace('value', '1.0'))
        except Exception:
            raise InvalidConditionException(detail="Invalid condition string provided. Example: 'value > 80.0'")

    alert_rule_updated = await crud_alert_rule.update(db, db_obj=alert_rule, obj_in=alert_rule_in)
    logger.info(f"Admin {current_user.email} updated alert rule ID: {rule_id}")
    return AlertRuleRead.model_validate(alert_rule_updated)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    *,
    db: AsyncSession = Depends(get_db),
    rule_id: int,
    current_user: User = Depends(get_current_active_admin), # Only admins can delete alert rules
) -> None:
    """
    Delete an alert rule. (Admin only)
    """
    alert_rule = await crud_alert_rule.get(db, id=rule_id)
    if not alert_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found"
        )
    await crud_alert_rule.remove(db, id=rule_id)
    logger.info(f"Admin {current_user.email} deleted alert rule with ID: {rule_id}")
```

#### `app/api/v1/endpoints/alert_notifications.py`
```python