```python
import logging
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, status
from fastapi_cache.decorator import cache
from app.core.config import settings

from app.core.exceptions import ForbiddenException, NotFoundException, BadRequestException
from app.crud.dashboard import dashboard as crud_dashboard
from app.crud.visualization import visualization as crud_visualization
from app.dependencies import CurrentUser, DBSession
from app.schemas.dashboard import Dashboard, DashboardCreate, DashboardUpdate
from app.schemas.visualization import VisualizationData
from app.api.v1.endpoints.visualizations import get_visualization_data # Re-use data fetching logic

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=Dashboard, status_code=status.HTTP_201_CREATED, summary="Create new dashboard")
async def create_dashboard(
    *,
    db: DBSession,
    dashboard_in: DashboardCreate,
    current_user: CurrentUser,
) -> Dashboard:
    """
    Create new dashboard.
    """
    # Optional: Validate visualization IDs in layout exist and are accessible
    # This can be complex if layout is arbitrary JSON,
    # for simplicity, we'll assume the client ensures valid IDs.
    new_dashboard = await crud_dashboard.create(db, obj_in=dashboard_in, owner_id=current_user.id)
    return new_dashboard


@router.get("/", response_model=List[Dashboard], summary="Get all dashboards")
async def read_dashboards(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> List[Dashboard]:
    """
    Retrieve dashboards.
    Admins can see all, regular users only their own.
    """
    if current_user.is_superuser:
        dashboards = await crud_dashboard.get_multi(db, skip=skip, limit=limit)
    else:
        result = await db.execute(
            crud_dashboard.model.select().filter(crud_dashboard.model.owner_id == current_user.id)
            .offset(skip).limit(limit).order_by(crud_dashboard.model.created_at.desc())
        )
        dashboards = list(result.scalars().all())
    return dashboards


@router.get("/{dashboard_id}", response_model=Dashboard, summary="Get dashboard by ID")
async def read_dashboard_by_id(
    dashboard_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Dashboard:
    """
    Get a specific dashboard by ID.
    User must be owner or superuser.
    """
    dashboard = await crud_dashboard.get(db, dashboard_id)
    if not dashboard:
        raise NotFoundException(detail="Dashboard not found")
    if not current_user.is_superuser and dashboard.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to access this dashboard")
    return dashboard


@router.put("/{dashboard_id}", response_model=Dashboard, summary="Update dashboard by ID")
async def update_dashboard(
    *,
    db: DBSession,
    dashboard_id: UUID,
    dashboard_in: DashboardUpdate,
    current_user: CurrentUser,
) -> Dashboard:
    """
    Update a dashboard.
    User must be owner or superuser.
    """
    dashboard = await crud_dashboard.get(db, dashboard_id)
    if not dashboard:
        raise NotFoundException(detail="Dashboard not found")
    if not current_user.is_superuser and dashboard.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to modify this dashboard")

    updated_dashboard = await crud_dashboard.update(db, db_obj=dashboard, obj_in=dashboard_in)
    return updated_dashboard


@router.delete("/{dashboard_id}", response_model=Dashboard, summary="Delete dashboard by ID")
async def delete_dashboard(
    dashboard_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Dashboard:
    """
    Delete a dashboard.
    User must be owner or superuser.
    """
    dashboard = await crud_dashboard.get(db, dashboard_id)
    if not dashboard:
        raise NotFoundException(detail="Dashboard not found")
    if not current_user.is_superuser and dashboard.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to delete this dashboard")

    await crud_dashboard.remove(db, id=dashboard_id)
    return dashboard


@router.post("/{dashboard_id}/data", summary="Get all data for a dashboard's visualizations", response_model=Dict[UUID, VisualizationData])
@cache(expire=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60) # Cache for 1 hour
async def get_dashboard_data(
    dashboard_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Dict[UUID, VisualizationData]:
    """
    Fetches all data for visualizations contained within a dashboard.
    This endpoint iterates through visualization IDs in the dashboard's layout and
    calls the /visualizations/{id}/data endpoint for each.
    """
    dashboard = await crud_dashboard.get(db, dashboard_id)
    if not dashboard:
        raise NotFoundException(detail="Dashboard not found")
    if not current_user.is_superuser and dashboard.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to access this dashboard's data")

    # Assuming dashboard.layout contains a list of visualization IDs or similar structure
    # For a simple example, let's assume `dashboard.layout = {"widgets": [{"id": "viz_uuid1"}, {"id": "viz_uuid2"}]}`
    visualization_ids_in_layout = []
    if dashboard.layout and "widgets" in dashboard.layout:
        for widget in dashboard.layout["widgets"]:
            if "visualization_id" in widget:
                try:
                    visualization_ids_in_layout.append(UUID(widget["visualization_id"]))
                except ValueError:
                    logger.warning(f"Invalid visualization ID in dashboard layout: {widget['visualization_id']}")
                    continue

    if not visualization_ids_in_layout:
        return {}

    # Fetch data for all visualizations concurrently
    results = {}
    for viz_id in visualization_ids_in_layout:
        try:
            # Re-using the logic from get_visualization_data to avoid duplication
            # Note: This is a synchronous call to an async function,
            # for true concurrency, you'd use asyncio.gather here.
            # But FastAPI handles async endpoints naturally.
            viz_data = await get_visualization_data(viz_id, db, current_user)
            results[viz_id] = viz_data
        except Exception as e:
            logger.error(f"Failed to fetch data for visualization {viz_id} in dashboard {dashboard_id}: {e}")
            results[viz_id] = {"error": str(e), "visualization_id": viz_id} # Indicate error for specific viz

    return results
```