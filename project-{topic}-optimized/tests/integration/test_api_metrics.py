import pytest
from httpx import AsyncClient
from fastapi import status
from app.core.config import settings
from app.crud.service import crud_service
from app.crud.metric_type import crud_metric_type
from app.crud.metric_record import crud_metric_record
from app.schemas.service import ServiceCreate
from app.schemas.metric_type import MetricTypeCreate
from app.schemas.metric_record import MetricRecordCreate
from datetime import datetime, timedelta, timezone

@pytest.fixture
async def setup_metric_data(db_session):
    service1 = await crud_service.create(db_session, obj_in=ServiceCreate(name="TestService1"))
    service2 = await crud_service.create(db_session, obj_in=ServiceCreate(name="TestService2"))
    cpu_metric = await crud_metric_type.create(db_session, obj_in=MetricTypeCreate(name="CPU_Usage", unit="%"))
    mem_metric = await crud_metric_type.create(db_session, obj_in=MetricTypeCreate(name="Memory_Usage", unit="MB"))

    now = datetime.now(timezone.utc)
    # Service1 CPU
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service1.id, metric_type_id=cpu_metric.id, value=50.0, timestamp=now - timedelta(minutes=5)))
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service1.id, metric_type_id=cpu_metric.id, value=60.0, timestamp=now - timedelta(minutes=1)))
    # Service1 Memory
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service1.id, metric_type_id=mem_metric.id, value=1024.0, timestamp=now - timedelta(minutes=2)))
    # Service2 CPU
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service2.id, metric_type_id=cpu_metric.id, value=30.0, timestamp=now - timedelta(minutes=10)))

    return service1, service2, cpu_metric, mem_metric, now

@pytest.mark.asyncio
async def test_create_metric_record_success(client: AsyncClient, normal_user_token, setup_metric_data):
    service1, _, cpu_metric, _, _ = setup_metric_data
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    metric_data = {
        "service_id": service1.id,
        "metric_type_id": cpu_metric.id,
        "value": 75.5,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = await client.post(f"{settings.API_V1_STR}/metric_records/", json=metric_data, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    record = response.json()
    assert record["value"] == 75.5

@pytest.mark.asyncio
async def test_create_metric_record_service_not_found(client: AsyncClient, normal_user_token, setup_metric_data):
    _, _, cpu_metric, _, _ = setup_metric_data
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    metric_data = {
        "service_id": 99999, # Non-existent service
        "metric_type_id": cpu_metric.id,
        "value": 10.0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = await client.post(f"{settings.API_V1_STR}/metric_records/", json=metric_data, headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Service not found" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_metric_records_filtered_by_service(client: AsyncClient, normal_user_token, setup_metric_data):
    service1, _, _, _, _ = setup_metric_data
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get(f"{settings.API_V1_STR}/metric_records/?service_id={service1.id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    records = response.json()
    assert len(records) == 3 # 2 CPU, 1 MEM from setup

@pytest.mark.asyncio
async def test_read_metric_records_filtered_by_service_and_type(client: AsyncClient, normal_user_token, setup_metric_data):
    service1, _, cpu_metric, _, _ = setup_metric_data
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get(f"{settings.API_V1_STR}/metric_records/?service_id={service1.id}&metric_type_id={cpu_metric.id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    records = response.json()
    assert len(records) == 2 # Only 2 CPU records for service1

@pytest.mark.asyncio
async def test_read_latest_metrics_for_service(client: AsyncClient, normal_user_token, setup_metric_data):
    service1, _, cpu_metric, mem_metric, _ = setup_metric_data
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get(f"{settings.API_V1_STR}/metric_records/service/{service1.id}/latest", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    latest_metrics = response.json()
    assert len(latest_metrics) == 2 # Latest CPU and latest MEM for service1

    # Check specific values
    cpu_rec = next((r for r in latest_metrics if r["metric_type_id"] == cpu_metric.id), None)
    mem_rec = next((r for r in latest_metrics if r["metric_type_id"] == mem_metric.id), None)
    assert cpu_rec["value"] == 60.0
    assert mem_rec["value"] == 1024.0

@pytest.mark.asyncio
async def test_read_metric_history_for_service_type(client: AsyncClient, normal_user_token, setup_metric_data):
    service1, _, cpu_metric, _, now = setup_metric_data
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    
    # Add an older record to ensure history is fetched
    await crud_metric_record.create(db_session, obj_in=MetricRecordCreate(service_id=service1.id, metric_type_id=cpu_metric.id, value=40.0, timestamp=now - timedelta(hours=3)))
    
    response = await client.get(f"{settings.API_V1_STR}/metric_records/service/{service1.id}/type/{cpu_metric.id}/history?period_hours=24", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    history = response.json()
    assert len(history) == 3 # 2 from setup, 1 just added
    assert history[0]["value"] == 40.0 # Should be ordered by timestamp asc
    assert history[2]["value"] == 60.0

```

#### `tests/performance/test_performance.py` (Using `pytest-benchmark` conceptually)
```python