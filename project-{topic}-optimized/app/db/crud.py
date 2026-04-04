import logging
from typing import TypeVar, Type, List, Optional, Dict, Any

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.base import Base # Import your Base for type hinting
from app.db.models import User, Item, Order, OrderItem, UserRole, OrderStatus # Import specific models for type hinting
from app.schemas.pagination import PaginatedResponse # Import PaginatedResponse

logger = logging.getLogger(__name__)

# Define a generic TypeVar for SQLAlchemy models
ModelType = TypeVar("ModelType", bound=Base)

class CRUDBase:
    """
    Base class for CRUD operations.
    Provides generic methods for creating, reading, updating, and deleting records.
    """

    def __init__(self, model: Type[ModelType]):
        """
        Initializes the CRUD class with a specific SQLAlchemy model.
        """
        self.model = model

    async def create(self, db: AsyncSession, obj_in: Dict[str, Any]) -> ModelType:
        """
        Creates a new record in the database.
        :param db: The async database session.
        :param obj_in: A dictionary of attributes for the new record.
        :return: The newly created model instance.
        """
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        logger.debug(f"Created {self.model.__name__} with ID: {getattr(db_obj, 'id', 'N/A')}")
        return db_obj

    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        """
        Retrieves a single record by its primary key ID.
        :param db: The async database session.
        :param id: The primary key ID of the record.
        :return: The model instance if found, otherwise None.
        """
        stmt = select(self.model).where(self.model.id == id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_desc: bool = False,
        eager_load: Optional[List[str]] = None
    ) -> PaginatedResponse[ModelType]:
        """
        Retrieves multiple records with pagination and optional filtering/ordering.
        :param db: The async database session.
        :param skip: Number of records to skip.
        :param limit: Maximum number of records to return.
        :param filters: Dictionary of filters (e.g., {"is_active": True}).
        :param order_by: Field to order by.
        :param order_desc: Whether to order in descending order.
        :param eager_load: List of relationship names to eager load (e.g., ["owner"]).
        :return: A PaginatedResponse object containing the list of records and total count.
        """
        stmt = select(self.model)

        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    stmt = stmt.where(getattr(self.model, field) == value)
                else:
                    logger.warning(f"Filter field '{field}' not found in model '{self.model.__name__}'. Ignoring.")

        # Apply eager loading if specified
        if eager_load:
            for relationship in eager_load:
                if hasattr(self.model, relationship):
                    stmt = stmt.options(selectinload(getattr(self.model, relationship)))
                else:
                    logger.warning(f"Relationship '{relationship}' not found in model '{self.model.__name__}'. Ignoring eager load.")

        # Get total count before applying limit and offset
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar_one()

        if order_by and hasattr(self.model, order_by):
            order_column = getattr(self.model, order_by)
            if order_desc:
                stmt = stmt.order_by(desc(order_column))
            else:
                stmt = stmt.order_by(order_column)
        else:
            # Default order by ID if not specified
            stmt = stmt.order_by(self.model.id)

        stmt = stmt.offset(skip).limit(limit)

        result = await db.execute(stmt)
        items = result.scalars().all()
        return PaginatedResponse(total=total, skip=skip, limit=limit, data=items)

    async def update(self, db: AsyncSession, db_obj: ModelType, obj_in: Dict[str, Any]) -> ModelType:
        """
        Updates an existing record in the database.
        :param db: The async database session.
        :param db_obj: The existing model instance to update.
        :param obj_in: A dictionary of attributes to update.
        :return: The updated model instance.
        """
        for field, value in obj_in.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        logger.debug(f"Updated {self.model.__name__} with ID: {getattr(db_obj, 'id', 'N/A')}")
        return db_obj

    async def delete(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        """
        Deletes a record from the database by its primary key ID.
        :param db: The async database session.
        :param id: The primary key ID of the record to delete.
        :return: The deleted model instance if found and deleted, otherwise None.
        """
        db_obj = await self.get(db, id)
        if db_obj:
            await db.delete(db_obj)
            await db.commit()
            logger.debug(f"Deleted {self.model.__name__} with ID: {id}")
            return db_obj
        logger.warning(f"Attempted to delete non-existent {self.model.__name__} with ID: {id}")
        return None

# Instantiate CRUD objects for each model
user_crud = CRUDBase(User)
item_crud = CRUDBase(Item)
order_crud = CRUDBase(Order)
order_item_crud = CRUDBase(OrderItem)
```