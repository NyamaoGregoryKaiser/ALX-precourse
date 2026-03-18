```python
import logging
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy.orm import selectinload
from fastapi_cache.decorator import cache
from app.core.config import settings

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.crud.dataset import dataset as crud_dataset
from app.crud.visualization import visualization as crud_visualization
from app.dependencies import CurrentUser, DBSession
from app.schemas.visualization import Visualization, VisualizationCreate, VisualizationData, VisualizationUpdate
from app.services.data_connector import data_connector
from app.services.data_transformer import data_transformer

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=Visualization, status_code=status.HTTP_201_CREATED, summary="Create new visualization")
async def create_visualization(
    *,
    db: DBSession,
    visualization_in: VisualizationCreate,
    current_user: CurrentUser,
) -> Visualization:
    """
    Create new visualization.
    Validates that the dataset exists and is accessible by the user.
    """
    dataset = await crud_dataset.get(db, visualization_in.dataset_id)
    if not dataset:
        raise NotFoundException(detail="Dataset not found")
    if not current_user.is_superuser and dataset.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to use this dataset for a visualization")

    new_visualization = await crud_visualization.create(db, obj_in=visualization_in, owner_id=current_user.id)
    return new_visualization


@router.get("/", response_model=List[Visualization], summary="Get all visualizations")
async def read_visualizations(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> List[Visualization]:
    """
    Retrieve visualizations.
    Admins can see all, regular users only their own.
    """
    if current_user.is_superuser:
        visualizations = await crud_visualization.get_multi(db, skip=skip, limit=limit)
    else:
        result = await db.execute(
            crud_visualization.model.select().filter(crud_visualization.model.owner_id == current_user.id)
            .offset(skip).limit(limit).order_by(crud_visualization.model.created_at.desc())
        )
        visualizations = list(result.scalars().all())
    return visualizations


@router.get("/{visualization_id}", response_model=Visualization, summary="Get visualization by ID")
async def read_visualization_by_id(
    visualization_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Visualization:
    """
    Get a specific visualization by ID.
    User must be owner or superuser.
    """
    visualization = await crud_visualization.get(db, visualization_id)
    if not visualization:
        raise NotFoundException(detail="Visualization not found")
    if not current_user.is_superuser and visualization.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to access this visualization")
    return visualization


@router.put("/{visualization_id}", response_model=Visualization, summary="Update visualization by ID")
async def update_visualization(
    *,
    db: DBSession,
    visualization_id: UUID,
    visualization_in: VisualizationUpdate,
    current_user: CurrentUser,
) -> Visualization:
    """
    Update a visualization.
    User must be owner or superuser. If dataset_id is updated, validate access.
    """
    visualization = await crud_visualization.get(db, visualization_id)
    if not visualization:
        raise NotFoundException(detail="Visualization not found")
    if not current_user.is_superuser and visualization.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to modify this visualization")

    if visualization_in.dataset_id and visualization_in.dataset_id != visualization.dataset_id:
        new_dataset = await crud_dataset.get(db, visualization_in.dataset_id)
        if not new_dataset:
            raise NotFoundException(detail="New Dataset not found")
        if not current_user.is_superuser and new_dataset.owner_id != current_user.id:
            raise ForbiddenException(detail="Not enough permissions to use the new dataset")

    updated_visualization = await crud_visualization.update(db, db_obj=visualization, obj_in=visualization_in)
    return updated_visualization


@router.delete("/{visualization_id}", response_model=Visualization, summary="Delete visualization by ID")
async def delete_visualization(
    visualization_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Visualization:
    """
    Delete a visualization.
    User must be owner or superuser.
    """
    visualization = await crud_visualization.get(db, visualization_id)
    if not visualization:
        raise NotFoundException(detail="Visualization not found")
    if not current_user.is_superuser and visualization.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to delete this visualization")

    await crud_visualization.remove(db, id=visualization_id)
    return visualization


@router.post("/{visualization_id}/data", summary="Get data for a visualization", response_model=VisualizationData)
@cache(expire=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60) # Cache for 1 hour
async def get_visualization_data(
    visualization_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> VisualizationData:
    """
    Fetches and transforms data for a given visualization.
    """
    visualization = await db.execute(
        crud_visualization.model.select()
        .options(
            selectinload(crud_visualization.model.dataset)
            .selectinload(crud_dataset.model.data_source)
        )
        .filter(crud_visualization.model.id == visualization_id)
    )
    visualization = visualization.scalars().first()

    if not visualization or not visualization.dataset or not visualization.dataset.data_source:
        raise NotFoundException(detail="Visualization, its Dataset, or Data Source not found")
    if not current_user.is_superuser and visualization.owner_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to access this visualization's data")

    try:
        # 1. Fetch raw data from data source using the dataset's query
        raw_data = await data_connector.fetch_data(
            data_source=visualization.dataset.data_source,
            query=visualization.dataset.query_string,
            parameters=visualization.dataset.parameters,
        )

        # 2. Transform raw data based on visualization config
        transformed_data = data_transformer.transform(
            raw_data=raw_data,
            config=visualization.config,
        )

        return VisualizationData(
            visualization=visualization,
            data=transformed_data,
        )
    except BadRequestException as e:
        raise e
    except Exception as e:
        logger.error(f"Error processing visualization data: {e}")
        raise BadRequestException(detail=f"Failed to process visualization data: {e}")
```