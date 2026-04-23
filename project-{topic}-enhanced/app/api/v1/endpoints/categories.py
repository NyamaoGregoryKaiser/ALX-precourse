```python
import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_limiter.depends import RateLimiter

from app.core.deps import get_db, CurrentUser
from app.core.exceptions import HTTPException400, HTTPException404, HTTPException409
from app.core.cache import cache_1_minute
from app.crud.crud_category import crud_category
from app.schemas.category import Category, CategoryCreate, CategoryUpdate
from app.schemas.msg import Msg
from app.db.models.category import Category as DBCategory

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[Category], summary="Retrieve user's categories",
            dependencies=[Depends(RateLimiter(times=10, seconds=60))])
@cache_1_minute
async def read_categories(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category_type: Optional[str] = Query(None, pattern="^(income|expense)$", description="Filter by type ('income' or 'expense')"),
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Retrieve categories belonging to the current user.
    """
    if category_type:
        categories = await crud_category.get_multi_by_owner_and_type(
            db, owner_id=current_user.id, category_type=category_type, skip=skip, limit=limit
        )
    else:
        categories = await crud_category.get_multi_by_owner(db, owner_id=current_user.id, skip=skip, limit=limit)
    logger.info(f"User {current_user.email} retrieved {len(categories)} categories (type: {category_type or 'all'}).")
    return categories

@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED, summary="Create a new category")
async def create_category(
    *,
    db: AsyncSession = Depends(get_db),
    category_in: CategoryCreate,
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Create a new category for the current user.
    """
    existing_category = await crud_category.get_by_name_and_owner(db, name=category_in.name, owner_id=current_user.id)
    if existing_category:
        raise HTTPException409(detail="A category with this name already exists for you.")
    
    category = await crud_category.create_with_owner(db, obj_in=category_in, owner_id=current_user.id)
    logger.info(f"User {current_user.email} created category: '{category.name}' ({category.type})")
    return category

@router.get("/{category_id}", response_model=Category, summary="Retrieve a specific category")
async def read_category_by_id(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Get a specific category by ID, ensuring it belongs to the current user.
    """
    category = await crud_category.get(db, id=category_id)
    if not category or category.owner_id != current_user.id:
        raise HTTPException404(detail="Category not found or you don't have permission to access it.")
    logger.info(f"User {current_user.email} accessed category with ID: {category_id}")
    return category

@router.put("/{category_id}", response_model=Category, summary="Update a category")
async def update_category(
    *,
    db: AsyncSession = Depends(get_db),
    category_id: int,
    category_in: CategoryUpdate,
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Update a category for the current user.
    """
    category = await crud_category.get(db, id=category_id)
    if not category or category.owner_id != current_user.id:
        raise HTTPException404(detail="Category not found or you don't have permission to update it.")
    
    # Check if a category with the new name already exists for this user
    if category_in.name and category_in.name != category.name:
        existing_category = await crud_category.get_by_name_and_owner(db, name=category_in.name, owner_id=current_user.id)
        if existing_category and existing_category.id != category_id:
            raise HTTPException409(detail="A category with this new name already exists for you.")

    category = await crud_category.update(db, db_obj=category, obj_in=category_in)
    logger.info(f"User {current_user.email} updated category with ID: {category_id}")
    return category

@router.delete("/{category_id}", response_model=Msg, summary="Delete a category")
async def delete_category(
    *,
    db: AsyncSession = Depends(get_db),
    category_id: int,
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Delete a category belonging to the current user.
    """
    category = await crud_category.get(db, id=category_id)
    if not category or category.owner_id != current_user.id:
        raise HTTPException404(detail="Category not found or you don't have permission to delete it.")
    
    # Optional: Implement a check for dependent transactions/budgets.
    # For now, relying on DB foreign key constraints for cascading deletes or errors.
    
    await crud_category.remove(db, id=category_id)
    logger.info(f"User {current_user.email} deleted category with ID: {category_id}")
    return Msg(message="Category deleted successfully")

```