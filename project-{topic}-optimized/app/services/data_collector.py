import random
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.service import crud_service
from app.crud.metric_type import crud_metric_type
from app.crud.metric_record import crud_metric_record
from app.schemas.metric_record import MetricRecordCreate
from app.core.logger import logger

async def simulate_data_collection(db: AsyncSession):
    """
    Simulates collection of metric data for active services.
    Generates random metric values within a reasonable range.
    """
    logger.info("Starting simulated data collection...")
    
    active_services = await crud_service.get_multi_filtered(db, filters={"is_active": True})
    if not active_services:
        logger.info("No active services found for data collection.")
        return

    metric_types = await crud_metric_type.get_multi(db)
    if not metric_types:
        logger.warning("No metric types defined. Skipping data collection.")
        return

    collected_count = 0
    for service in active_services:
        for metric_type in metric_types:
            value = None
            if metric_type.name == "CPU_USAGE":
                value = round(random.uniform(10.0, 90.0), 2)
            elif metric_type.name == "MEMORY_USAGE":
                value = round(random.uniform(20.0, 95.0), 2)
            elif metric_type.name == "LATENCY":
                value = round(random.uniform(5.0, 200.0), 2)
            elif metric_type.name == "ERROR_RATE":
                value = round(random.uniform(0.0, 5.0), 2)
            else:
                value = round(random.uniform(0.0, 100.0), 2) # Default for unknown types

            if value is not None:
                metric_record_in = MetricRecordCreate(
                    service_id=service.id,
                    metric_type_id=metric_type.id,
                    value=value,
                    timestamp=datetime.now(timezone.utc)
                )
                await crud_metric_record.create(db, obj_in=metric_record_in)
                collected_count += 1
                logger.debug(f"Collected: Service '{service.name}', Metric '{metric_type.name}', Value: {value}{metric_type.unit or ''}")
    
    logger.info(f"Finished simulated data collection. {collected_count} metric records added.")

```

#### `app/services/alert_evaluator.py`
```python