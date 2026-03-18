```python
from app.crud.base import CRUDBase
from app.models.datasource import DataSource
from app.schemas.datasource import DataSourceCreate, DataSourceUpdate


class CRUDDataSource(CRUDBase[DataSource, DataSourceCreate, DataSourceUpdate]):
    """CRUD operations for DataSource model."""
    pass


datasource = CRUDDataSource(DataSource)
```