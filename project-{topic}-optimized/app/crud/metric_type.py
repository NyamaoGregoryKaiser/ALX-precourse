from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.metric_type import MetricType
from app.schemas.metric_type import MetricTypeCreate, MetricTypeUpdate


class CRUDMetricType(CRUDBase[MetricType, MetricTypeCreate, MetricTypeUpdate]):
    async def get_by_name(self, db: AsyncSession, *, name: str) -> Optional[MetricType]:
        """
        Retrieve a metric type by its name.
        """
        stmt = select(self.model).where(self.model.name == name)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

crud_metric_type = CRUDMetricType(MetricType)

```

```python