```python
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, datasources, datasets, visualizations, dashboards

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(datasources.router, prefix="/datasources", tags=["datasources"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(visualizations.router, prefix="/visualizations", tags=["visualizations"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["dashboards"])
```