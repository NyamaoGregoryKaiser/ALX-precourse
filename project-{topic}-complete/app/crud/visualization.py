```python
from app.crud.base import CRUDBase
from app.models.visualization import Visualization
from app.schemas.visualization import VisualizationCreate, VisualizationUpdate


class CRUDVisualization(CRUDBase[Visualization, VisualizationCreate, VisualizationUpdate]):
    """CRUD operations for Visualization model."""
    pass


visualization = CRUDVisualization(Visualization)
```