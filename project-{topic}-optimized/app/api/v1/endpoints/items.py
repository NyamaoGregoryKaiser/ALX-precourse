import logging
from typing import List

from fastapi import APIRouter, Depends, status, Query, HTTPException
from fastapi_limiter.depends import RateLimiter
from fastapi_cache.decorator import cache
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db
from app.db.models import User, UserRole
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.schemas.pagination import PaginatedResponse
from app.services.item_service import ItemService
from app.utils.security import get_current_active_user, get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[ItemResponse],
            dependencies=[Depends(RateLimiter(times=60, seconds=60))], # 60 requests per minute
            summary="Get all items",
            description="Retrieve a paginated list of all active or inactive items.")
@cache(expire=settings.CACHE_EXPIRE_SECONDS) # Cache this endpoint's responses
async def read_items(
    skip: int = Query(0, ge=0, description="Number of items to skip (offset)."),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of items to return."),
    is_active: bool | None = Query(True, description="Filter items by active status (default: True)."),
    item_service: ItemService = Depends(lambda db=Depends(get_db): ItemService(db))
):
    """
    Retrieve a paginated list of items.
    Allows filtering by `is_active` status. Responses are cached.
    """
    logger.info(f"Accessing items list (skip: {skip}, limit: {limit}, is_active: {is_active}).")
    items = await item_service.get_all_items(skip=skip, limit=limit, is_active=is_active)
    return items

@router.get("/{item_id}", response_model=ItemResponse,
            dependencies=[Depends(RateLimiter(times=30, seconds=60))], # 30 requests per minute
            summary="Get item by ID",
            description="Retrieve a single item's details by ID.")
@cache(expire=settings.CACHE_EXPIRE_SECONDS)
async def read_item_by_id(
    item_id: int,
    item_service: ItemService = Depends(lambda db=Depends(get_db): ItemService(db))
):
    """
    Retrieve details of a specific item by ID.
    Responses are cached.
    """
    logger.info(f"Accessing item ID: {item_id}.")
    item = await item_service.get_item_by_id(item_id)
    return item

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED,
            dependencies=[Depends(RateLimiter(times=10, seconds=60))], # 10 requests per minute
            summary="Create a new item",
            description="Create a new item. Requires authentication as an active user or admin.")
async def create_item(
    item_in: ItemCreate,
    current_user: User = Depends(get_current_active_user), # Requires active user
    item_service: ItemService = Depends(lambda db=Depends(get_db): ItemService(db))
):
    """
    Create a new item. The `owner_id` will be automatically set to the ID of the authenticated user.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) attempting to create new item.")
    item = await item_service.create_item(item_in, current_user)
    return item

@router.put("/{item_id}", response_model=ItemResponse,
            dependencies=[Depends(RateLimiter(times=5, seconds=60))], # 5 requests per minute
            summary="Update an item",
            description="Update an existing item. Requires ownership or admin privileges.")
async def update_item(
    item_id: int,
    item_in: ItemUpdate,
    current_user: User = Depends(get_current_active_user),
    item_service: ItemService = Depends(lambda db=Depends(get_db): ItemService(db))
):
    """
    Update details of an existing item by ID.
    Only the item's owner or an administrator can update an item.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) attempting to update item ID {item_id}.")
    updated_item = await item_service.update_item(item_id, item_in, current_user)
    return updated_item

@router.delete("/{item_id}", response_model=ItemResponse,
            dependencies=[Depends(RateLimiter(times=2, seconds=300))], # 2 requests per 5 minutes
            summary="Delete an item",
            description="Delete an item. Requires ownership or admin privileges.")
async def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    item_service: ItemService = Depends(lambda db=Depends(get_db): ItemService(db))
):
    """
    Delete an item by ID.
    Only the item's owner or an administrator can delete an item.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) attempting to delete item ID {item_id}.")
    deleted_item = await item_service.delete_item(item_id, current_user)
    return deleted_item
```