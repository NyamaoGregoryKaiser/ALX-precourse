import logging
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import item_crud
from app.db.models import Item, User
from app.schemas.item import ItemCreate, ItemUpdate
from app.schemas.pagination import PaginatedResponse

logger = logging.getLogger(__name__)

class ItemService:
    """
    Service layer for Item related operations.
    Handles business logic for creating, reading, updating, and deleting items.
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_all_items(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None
    ) -> PaginatedResponse[Item]:
        """
        Retrieves a paginated list of all items, with optional filtering by active status.
        :param skip: Number of items to skip.
        :param limit: Maximum number of items to return.
        :param is_active: Filter by item active status.
        :return: PaginatedResponse containing Item objects.
        """
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        
        items = await item_crud.get_multi(self.db_session, skip=skip, limit=limit, filters=filters)
        logger.debug(f"Retrieved {len(items.data)} items.")
        return items

    async def get_item_by_id(self, item_id: int) -> Item:
        """
        Retrieves a single item by its ID.
        :param item_id: The ID of the item to retrieve.
        :return: The Item database object.
        :raises HTTPException: If the item is not found.
        """
        item = await item_crud.get(self.db_session, item_id)
        if not item:
            logger.warning(f"Item with ID {item_id} not found.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        logger.debug(f"Retrieved item: {item.name} (ID: {item.id})")
        return item

    async def create_item(self, item_in: ItemCreate, owner: User) -> Item:
        """
        Creates a new item.
        :param item_in: Pydantic model containing item creation data.
        :param owner: The User database object who owns/creates the item.
        :return: The newly created Item database object.
        """
        item_data = item_in.model_dump()
        item_data["owner_id"] = owner.id
        new_item = await item_crud.create(self.db_session, item_data)
        logger.info(f"Item '{new_item.name}' created by user ID {owner.id}.")
        return new_item

    async def update_item(self, item_id: int, item_in: ItemUpdate, current_user: User) -> Item:
        """
        Updates an existing item.
        Only the owner or an admin can update an item.
        :param item_id: The ID of the item to update.
        :param item_in: Pydantic model containing item update data.
        :param current_user: The authenticated User database object.
        :return: The updated Item database object.
        :raises HTTPException: If item not found, or user is not authorized.
        """
        db_item = await self.get_item_by_id(item_id)

        if db_item.owner_id != current_user.id and current_user.role != "admin":
            logger.warning(f"User {current_user.id} (role: {current_user.role}) attempted to update item {item_id} "
                           f"owned by {db_item.owner_id} without authorization.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this item")

        update_data = item_in.model_dump(exclude_unset=True)
        updated_item = await item_crud.update(self.db_session, db_item, update_data)
        logger.info(f"Item '{updated_item.name}' (ID: {updated_item.id}) updated by user ID {current_user.id}.")
        return updated_item

    async def delete_item(self, item_id: int, current_user: User) -> Item:
        """
        Deletes an item.
        Only the owner or an admin can delete an item.
        :param item_id: The ID of the item to delete.
        :param current_user: The authenticated User database object.
        :return: The deleted Item database object.
        :raises HTTPException: If item not found, or user is not authorized.
        """
        db_item = await self.get_item_by_id(item_id)

        if db_item.owner_id != current_user.id and current_user.role != "admin":
            logger.warning(f"User {current_user.id} (role: {current_user.role}) attempted to delete item {item_id} "
                           f"owned by {db_item.owner_id} without authorization.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this item")

        deleted_item = await item_crud.delete(self.db_session, item_id)
        if not deleted_item: # Should theoretically not happen if get_item_by_id succeeded
            logger.error(f"Failed to delete item {item_id} after it was found.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete item")
        
        logger.info(f"Item '{deleted_item.name}' (ID: {deleted_item.id}) deleted by user ID {current_user.id}.")
        return deleted_item

    async def decrease_item_stock(self, item: Item, quantity: int, db: AsyncSession) -> Item:
        """
        Decreases the stock quantity of an item.
        :param item: The Item object to update.
        :param quantity: The amount to decrease stock by.
        :param db: The async database session.
        :return: The updated Item object.
        :raises HTTPException: If stock quantity becomes negative.
        """
        if item.stock_quantity < quantity:
            logger.warning(f"Insufficient stock for item {item.id}. Requested {quantity}, available {item.stock_quantity}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for item '{item.name}'")
        
        item.stock_quantity -= quantity
        updated_item = await item_crud.update(db, item, {"stock_quantity": item.stock_quantity})
        logger.debug(f"Decreased stock for item {item.id} by {quantity}. New stock: {updated_item.stock_quantity}.")
        return updated_item

    async def increase_item_stock(self, item: Item, quantity: int, db: AsyncSession) -> Item:
        """
        Increases the stock quantity of an item.
        :param item: The Item object to update.
        :param quantity: The amount to increase stock by.
        :param db: The async database session.
        :return: The updated Item object.
        """
        item.stock_quantity += quantity
        updated_item = await item_crud.update(db, item, {"stock_quantity": item.stock_quantity})
        logger.debug(f"Increased stock for item {item.id} by {quantity}. New stock: {updated_item.stock_quantity}.")
        return updated_item
```