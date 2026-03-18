```python
from app.crud.base import CRUDBase
from app.models.dashboard import Dashboard
from app.schemas.dashboard import DashboardCreate, DashboardUpdate


class CRUDDashboard(CRUDBase[Dashboard, DashboardCreate, DashboardUpdate]):
    """CRUD operations for Dashboard model."""
    pass


dashboard = CRUDDashboard(Dashboard)
```