from typing import List, Optional
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.metric_record import MetricRecord
from app.models.metric_type import MetricType
from app.schemas.metric_record import MetricRecordCreate, MetricRecordUpdate


class CRUDMetricRecord(CRUDBase[MetricRecord, MetricRecordCreate, MetricRecordUpdate]):
    async def get_latest_metrics_for_service(
        self, db: AsyncSession, *, service_id: int
    ) -> List[MetricRecord]:
        """
        Retrieve the latest metric record for each metric type for a given service.
        This is optimized using a subquery to find the max timestamp per metric_type_id
        and then joining back to retrieve the full records.
        """
        subquery = (
            select(
                MetricRecord.metric_type_id,
                func.max(MetricRecord.timestamp).label("max_timestamp"),
            )
            .where(MetricRecord.service_id == service_id)
            .group_by(MetricRecord.metric_type_id)
            .subquery()
        )

        stmt = (
            select(MetricRecord)
            .join(
                subquery,
                (MetricRecord.metric_type_id == subquery.c.metric_type_id)
                & (MetricRecord.timestamp == subquery.c.max_timestamp),
            )
            .where(MetricRecord.service_id == service_id)
            .options(selectinload(MetricRecord.metric_type)) # Eager load metric_type
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_records_by_service_and_type_in_time_range(
        self,
        db: AsyncSession,
        *,
        service_id: int,
        metric_type_id: int,
        start_time: datetime,
        end_time: datetime,
        skip: int = 0,
        limit: int = 100,
    ) -> List[MetricRecord]:
        """
        Retrieve metric records for a specific service and metric type within a time range.
        """
        stmt = (
            select(self.model)
            .where(
                self.model.service_id == service_id,
                self.model.metric_type_id == metric_type_id,
                self.model.timestamp >= start_time,
                self.model.timestamp <= end_time,
            )
            .order_by(self.model.timestamp)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

crud_metric_record = CRUDMetricRecord(MetricRecord)

```

```python