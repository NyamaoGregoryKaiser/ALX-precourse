import pytest
from app.crud.user import crud_user
from app.crud.service import crud_service
from app.crud.metric_type import crud_metric_type
from app.crud.metric_record import crud_metric_record
from app.crud.alert_rule import crud_alert_rule
from app.crud.alert_notification import crud_alert_notification
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.service import ServiceCreate, ServiceUpdate
from app.schemas.metric_type import MetricTypeCreate, MetricTypeUpdate
from app.schemas.metric_record import MetricRecordCreate, MetricRecordUpdate
from app.schemas.alert_rule import AlertRuleCreate, AlertRuleUpdate
from app.schemas.alert_notification import AlertNotificationCreate, AlertNotificationUpdate
from datetime import datetime, timedelta, timezone

@pytest.mark.asyncio
async def test_create_user(db_session):
    user_in = UserCreate(email="test@example.com", password="password123", full_name="Test User")
    user = await crud_user.create(db_session, obj_in=user_in)
    assert user.email == "test@example.com"
    assert hasattr(user, "hashed_password")
    assert user.is_active is True
    assert user.is_admin is False

@pytest.mark.asyncio
async def test_get_user(db_session):
    user_in = UserCreate(email="get@example.com", password="password123")
    user_created = await crud_user.create(db_session, obj_in=user_in)
    user = await crud_user.get(db_session, id=user_created.id)
    assert user is not None
    assert user.email == "get@example.com"

@pytest.mark.asyncio
async def test_update_user(db_session):
    user_in = UserCreate(email="update@example.com", password="password123", full_name="Old Name")
    user_created = await crud_user.create(db_session, obj_in=user_in)
    
    user_update_in = UserUpdate(full_name="New Name", is_active=False)
    user_updated = await crud_user.update(db_session, db_obj=user_created, obj_in=user_update_in)
    
    assert user_updated.full_name == "New Name"
    assert user_updated.is_active is False

    # Test password update
    user_update_password_in = UserUpdate(password="newpassword")
    user_password_updated = await crud_user.update(db_session, db_obj=user_updated, obj_in=user_update_password_in)
    assert security.verify_password("newpassword", user_password_updated.hashed_password)

@pytest.mark.asyncio
async def test_delete_user(db_session):
    user_in = UserCreate(email="delete@example.com", password="password123")
    user_created = await crud_user.create(db_session, obj_in=user_in)
    await crud_user.remove(db_session, id=user_created.id)
    user = await crud_user.get(db_session, id=user_created.id)
    assert user is None

@pytest.mark.asyncio
async def test_create_service(db_session):
    service_in = ServiceCreate(name="Test Service", description="A service for testing")
    service = await crud_service.create(db_session, obj_in=service_in)
    assert service.name == "Test Service"
    assert service.is_active is True

@pytest.mark.asyncio
async def test_create_metric_type(db_session):
    metric_type_in = MetricTypeCreate(name="CPU_Load", unit="%")
    metric_type = await crud_metric_type.create(db_session, obj_in=metric_type_in)
    assert metric_type.name == "CPU_Load"
    assert metric_type.unit == "%"

@pytest.mark.asyncio
async def test_create_metric_record(db_session):
    service_in = ServiceCreate(name="Service for Metrics")
    service = await crud_service.create(db_session, obj_in=service_in)
    metric_type_in = MetricTypeCreate(name="Latency", unit="ms")
    metric_type = await crud_metric_type.create(db_session, obj_in=metric_type_in)

    metric_record_in = MetricRecordCreate(
        service_id=service.id,
        metric_type_id=metric_type.id,
        value=150.5,
        timestamp=datetime.now(timezone.utc)
    )
    metric_record = await crud_metric_record.create(db_session, obj_in=metric_record_in)
    assert metric_record.service_id == service.id
    assert metric_record.metric_type_id == metric_type.id
    assert metric_record.value == 150.5

@pytest.mark.asyncio
async def test_get_latest_metrics_for_service(db_session):
    service_in = ServiceCreate(name="Service for Latest Metrics")
    service = await crud_service.create(db_session, obj_in=service_in)
    cpu_type = await crud_metric_type.create(db_session, obj_in=MetricTypeCreate(name="CPU_Usage_Latest", unit="%"))
    mem_type = await crud_metric_type.create(db_session, obj_in=MetricTypeCreate(name="Memory_Usage_Latest", unit="MB"))

    # Old CPU record
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(
        service_id=service.id, metric_type_id=cpu_type.id, value=50.0, timestamp=datetime.now(timezone.utc) - timedelta(hours=1)
    ))
    # New CPU record
    latest_cpu = await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(
        service_id=service.id, metric_type_id=cpu_type.id, value=75.0, timestamp=datetime.now(timezone.utc)
    ))
    # Old MEM record
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(
        service_id=service.id, metric_type_id=mem_type.id, value=1024.0, timestamp=datetime.now(timezone.utc) - timedelta(minutes=30)
    ))
    # New MEM record
    latest_mem = await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(
        service_id=service.id, metric_type_id=mem_type.id, value=2048.0, timestamp=datetime.now(timezone.utc)
    ))

    latest_metrics = await crud_metric_record.get_latest_metrics_for_service(db_session, service_id=service.id)
    assert len(latest_metrics) == 2
    
    cpu_metric = next((m for m in latest_metrics if m.metric_type_id == cpu_type.id), None)
    mem_metric = next((m for m in latest_metrics if m.metric_type_id == mem_type.id), None)

    assert cpu_metric is not None
    assert cpu_metric.value == latest_cpu.value
    assert mem_metric is not None
    assert mem_metric.value == latest_mem.value

@pytest.mark.asyncio
async def test_create_alert_rule(db_session):
    service_in = ServiceCreate(name="Service for Alert")
    service = await crud_service.create(db_session, obj_in=service_in)
    metric_type_in = MetricTypeCreate(name="Error_Rate", unit="count/min")
    metric_type = await crud_metric_type.create(db_session, obj_in=metric_type_in)

    alert_rule_in = AlertRuleCreate(
        service_id=service.id,
        metric_type_id=metric_type.id,
        condition="value > 5.0",
        description="High error rate",
        is_active=True
    )
    alert_rule = await crud_alert_rule.create(db_session, obj_in=alert_rule_in)
    assert alert_rule.service_id == service.id
    assert alert_rule.metric_type_id == metric_type.id
    assert alert_rule.condition == "value > 5.0"

@pytest.mark.asyncio
async def test_create_alert_notification(db_session):
    service_in = ServiceCreate(name="Service for Notification")
    service = await crud_service.create(db_session, obj_in=service_in)
    metric_type_in = MetricTypeCreate(name="Memory_Usage", unit="%")
    metric_type = await crud_metric_type.create(db_session, obj_in=metric_type_in)
    alert_rule_in = AlertRuleCreate(
        service_id=service.id,
        metric_type_id=metric_type.id,
        condition="value > 90.0",
        description="High memory usage",
        is_active=True
    )
    alert_rule = await crud_alert_rule.create(db_session, obj_in=alert_rule_in)

    notification_in = AlertNotificationCreate(
        alert_rule_id=alert_rule.id,
        service_id=service.id,
        metric_type_id=metric_type.id,
        triggered_at=datetime.now(timezone.utc),
        current_value="92.5",
        message="Memory usage critical!",
        is_resolved=False
    )
    notification = await crud_alert_notification.create(db_session, obj_in=notification_in)
    assert notification.alert_rule_id == alert_rule.id
    assert notification.current_value == "92.5"
    assert notification.is_resolved is False

@pytest.mark.asyncio
async def test_get_multi_filtered_users(db_session):
    await crud_user.create(db_session, obj_in=UserCreate(email="user1@example.com", password="pwd", is_active=True))
    await crud_user.create(db_session, obj_in=UserCreate(email="user2@example.com", password="pwd", is_active=False))
    await crud_user.create(db_session, obj_in=UserCreate(email="user3@example.com", password="pwd", full_name="John Doe"))

    active_users = await crud_user.get_multi_filtered(db_session, filters={"is_active": True})
    assert len(active_users) == 1 # Only user1, assuming previous tests didn't create active users in same session.

    john = await crud_user.get_multi_filtered(db_session, filters={"full_name": "John Doe"})
    assert len(john) == 1
    assert john[0].email == "user3@example.com"

@pytest.mark.asyncio
async def test_get_multi_filtered_metric_records_time_range(db_session):
    service_in = ServiceCreate(name="Time Range Service")
    service = await crud_service.create(db_session, obj_in=service_in)
    metric_type_in = MetricTypeCreate(name="Response_Time", unit="ms")
    metric_type = await crud_metric_type.create(db_session, obj_in=metric_type_in)

    now = datetime.now(timezone.utc)
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service.id, metric_type_id=metric_type.id, value=10.0, timestamp=now - timedelta(days=2)))
    record1 = await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service.id, metric_type_id=metric_type.id, value=20.0, timestamp=now - timedelta(hours=3)))
    record2 = await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service.id, metric_type_id=metric_type.id, value=30.0, timestamp=now - timedelta(hours=1)))
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service.id, metric_type_id=metric_type.id, value=40.0, timestamp=now + timedelta(hours=1)))

    filtered_records = await crud_metric_record.get_multi_filtered(
        db_session,
        filters={
            "service_id": service.id,
            "metric_type_id": metric_type.id,
            "timestamp_ge": now - timedelta(hours=4),
            "timestamp_le": now
        },
        order_by="timestamp_asc"
    )

    assert len(filtered_records) == 2
    assert filtered_records[0].id == record1.id
    assert filtered_records[1].id == record2.id

```

#### `tests/integration/test_api_auth.py`
```python