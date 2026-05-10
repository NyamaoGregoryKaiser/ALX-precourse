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
from datetime import datetime, timezone, timedelta
import random

# This uses pytest-benchmark which needs to be installed (pip install pytest-benchmark)
# To run: pytest --benchmark-min-time=0.0001 --benchmark-warmup=true tests/performance/test_performance.py

@pytest.fixture(scope="session")
async def perf_data_setup(db_engine):
    """
    Setup data for performance tests. Runs once per session.
    """
    async_session = async_sessionmaker(db_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as db:
        service_names = [f"PerfService{i}" for i in range(10)]
        metric_type_names = ["CPU", "Memory", "Network", "Latency", "Errors"]

        services = []
        for name in service_names:
            service = await crud_service.get_by_name(db, name=name)
            if not service:
                service = await crud_service.create(db, obj_in=ServiceCreate(name=name))
            services.append(service)
        
        metric_types = []
        for name in metric_type_names:
            m_type = await crud_metric_type.get_by_name(db, name=name)
            if not m_type:
                m_type = await crud_metric_type.create(db, obj_in=MetricTypeCreate(name=name, unit="%"))
            metric_types.append(m_type)

        # Generate a good amount of metric records
        num_records_per_service_type = 100
        logger.info(f"Generating {len(services) * len(metric_types) * num_records_per_service_type} metric records for performance tests...")
        
        for service in services:
            for m_type in metric_types:
                for i in range(num_records_per_service_type):
                    timestamp = datetime.now(timezone.utc) - timedelta(minutes=i*5) # Spread over time
                    value = round(random.uniform(0, 100), 2)
                    await crud_metric_record.create(db, obj_in=MetricRecordCreate(
                        service_id=service.id,
                        metric_type_id=m_type.id,
                        value=value,
                        timestamp=timestamp
                    ))
        
        logger.info("Performance test data setup complete.")
        return {
            "services": services,
            "metric_types": metric_types,
            "sample_service_id": services[0].id,
            "sample_metric_type_id": metric_types[0].id
        }

@pytest.mark.asyncio
async def test_performance_read_latest_metrics_for_service(client: AsyncClient, admin_token, perf_data_setup, benchmark):
    """
    Benchmark the /metric_records/service/{service_id}/latest endpoint.
    This involves a subquery and joins, potentially complex.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    service_id = perf_data_setup["sample_service_id"]

    @benchmark
    async def run_request():
        response = await client.get(f"{settings.API_V1_STR}/metric_records/service/{service_id}/latest", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == len(perf_data_setup["metric_types"]) # Should get one latest for each type

    run_request()


@pytest.mark.asyncio
async def test_performance_read_metric_history_for_service_type(client: AsyncClient, admin_token, perf_data_setup, benchmark):
    """
    Benchmark the /metric_records/service/{service_id}/type/{metric_type_id}/history endpoint.
    This fetches multiple records filtered by time range.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    service_id = perf_data_setup["sample_service_id"]
    metric_type_id = perf_data_setup["sample_metric_type_id"]
    period_hours = 24 * 30 # Last 30 days of data

    @benchmark
    async def run_request():
        response = await client.get(f"{settings.API_V1_STR}/metric_records/service/{service_id}/type/{metric_type_id}/history?period_hours={period_hours}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) > 0 # Should have many records

    run_request()


@pytest.mark.asyncio
async def test_performance_create_metric_record(client: AsyncClient, normal_user_token, perf_data_setup, benchmark):
    """
    Benchmark the /metric_records/ endpoint for data ingestion.
    """
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    service_id = perf_data_setup["services"][0].id
    metric_type_id = perf_data_setup["metric_types"][0].id

    @benchmark
    async def run_request():
        metric_data = {
            "service_id": service_id,
            "metric_type_id": metric_type_id,
            "value": round(random.uniform(0, 100), 2),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        response = await client.post(f"{settings.API_V1_STR}/metric_records/", json=metric_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED

    run_request()
```

---

### 5. Documentation

#### `README.md`
```markdown