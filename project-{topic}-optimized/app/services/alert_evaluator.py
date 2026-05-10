from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.alert_rule import crud_alert_rule
from app.crud.alert_notification import crud_alert_notification
from app.crud.metric_record import crud_metric_record
from app.models.metric_record import MetricRecord
from app.schemas.alert_notification import AlertNotificationCreate
from app.core.logger import logger

async def evaluate_alert_rules(db: AsyncSession):
    """
    Evaluates active alert rules against the latest metric data.
    If a rule is triggered, creates an alert notification.
    """
    logger.info("Starting alert rule evaluation...")

    active_rules = await crud_alert_rule.get_multi_filtered(
        db, filters={"is_active": True},
        options=[selectinload(crud_alert_rule.model.service), selectinload(crud_alert_rule.model.metric_type)]
    )
    if not active_rules:
        logger.info("No active alert rules found for evaluation.")
        return

    evaluated_count = 0
    triggered_count = 0

    for rule in active_rules:
        # Get the latest metric record for this service and metric type
        latest_records = await crud_metric_record.get_latest_metrics_for_service(db, service_id=rule.service_id)
        
        latest_metric: MetricRecord | None = None
        for record in latest_records:
            if record.metric_type_id == rule.metric_type_id:
                latest_metric = record
                break

        if not latest_metric:
            logger.debug(f"No recent metric data for rule '{rule.description or rule.condition}' on service {rule.service.name} / {rule.metric_type.name}.")
            continue
        
        evaluated_count += 1
        
        # Evaluate the condition
        # IMPORTANT: Using eval() directly with user input can be a security risk.
        # For a production system, consider a safer expression parser (e.g., numexpr)
        # or a more structured condition definition (e.g., 'operator', 'threshold_value').
        # Here, we assume condition strings are safely formatted (e.g., 'value > 80.0').
        try:
            # Create a local scope for eval to prevent arbitrary code execution
            scope = {'value': latest_metric.value}
            condition_met = eval(rule.condition, {"__builtins__": None}, scope) # Limited scope for safety

            if condition_met:
                # Check if an active (unresolved) notification already exists for this rule
                existing_active_notifications = await crud_alert_notification.get_multi_filtered(
                    db,
                    filters={
                        "alert_rule_id": rule.id,
                        "is_resolved": False,
                        "triggered_at_ge": datetime.now(timezone.utc) - timedelta(minutes=5) # Consider recent active notifications
                    }
                )
                if existing_active_notifications:
                    logger.debug(f"Rule '{rule.condition}' for {rule.service.name}/{rule.metric_type.name} triggered, but active notification already exists.")
                    continue

                # Trigger new alert
                message = (
                    f"Alert for service '{rule.service.name}' ({rule.metric_type.name}): "
                    f"Condition '{rule.condition}' met. Current value: {latest_metric.value}{rule.metric_type.unit or ''}"
                )
                notification_in = AlertNotificationCreate(
                    alert_rule_id=rule.id,
                    service_id=rule.service_id,
                    metric_type_id=rule.metric_type_id,
                    triggered_at=datetime.now(timezone.utc),
                    current_value=str(latest_metric.value),
                    message=message,
                    is_resolved=False
                )
                await crud_alert_notification.create(db, obj_in=notification_in)
                triggered_count += 1
                logger.warning(f"ALERT TRIGGERED: {message}")
            else:
                # If rule is no longer met, resolve any outstanding alerts for this rule
                active_notifications_to_resolve = await crud_alert_notification.get_multi_filtered(
                    db,
                    filters={
                        "alert_rule_id": rule.id,
                        "is_resolved": False
                    }
                )
                for notification in active_notifications_to_resolve:
                    await crud_alert_notification.update(
                        db,
                        db_obj=notification,
                        obj_in={"is_resolved": True, "resolved_at": datetime.now(timezone.utc)}
                    )
                    logger.info(f"Alert ID {notification.id} for rule '{rule.condition}' (Service: {rule.service.name}) resolved as condition is no longer met.")

        except Exception as e:
            logger.error(f"Error evaluating rule ID {rule.id} ('{rule.condition}'): {e}")
            # Optionally, disable the rule or notify an admin about evaluation failure

    logger.info(f"Finished alert rule evaluation. {evaluated_count} rules evaluated, {triggered_count} alerts triggered.")

```

#### `app/tasks/scheduler.py`
```python