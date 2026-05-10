from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import select, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    CRUD object with default methods to Create, Read, Update, Delete (CRUD).
    """

    def __init__(self, model: Type[ModelType]):
        """
        :param model: A SQLAlchemy model class
        """
        self.model = model

    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        """
        Retrieve a single record by ID.
        """
        stmt = select(self.model).where(self.model.id == id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """
        Retrieve multiple records.
        """
        stmt = select(self.model).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None # e.g., "created_at_desc", "name_asc"
    ) -> List[ModelType]:
        """
        Retrieve multiple records with filters.
        Filters dictionary supports specific patterns for comparisons:
        - `{field_name}`: exact match
        - `{field_name}_ge`: greater than or equal to
        - `{field_name}_le`: less than or equal to
        - `{field_name}_like`: LIKE operator (e.g., "%pattern%")
        """
        stmt = select(self.model)
        
        for key, value in filters.items():
            if key.endswith("_ge"):
                field_name = key[:-3]
                field = getattr(self.model, field_name, None)
                if field is not None and isinstance(field, InstrumentedAttribute):
                    stmt = stmt.where(field >= value)
            elif key.endswith("_le"):
                field_name = key[:-3]
                field = getattr(self.model, field_name, None)
                if field is not None and isinstance(field, InstrumentedAttribute):
                    stmt = stmt.where(field <= value)
            elif key.endswith("_like"):
                field_name = key[:-5]
                field = getattr(self.model, field_name, None)
                if field is not None and isinstance(field, InstrumentedAttribute):
                    stmt = stmt.where(field.ilike(value)) # Case-insensitive LIKE
            else:
                field = getattr(self.model, key, None)
                if field is not None and isinstance(field, InstrumentedAttribute):
                    stmt = stmt.where(field == value)
        
        if order_by:
            if order_by.endswith("_desc"):
                field_name = order_by[:-5]
                field = getattr(self.model, field_name, None)
                if field is not None and isinstance(field, InstrumentedAttribute):
                    stmt = stmt.order_by(desc(field))
            elif order_by.endswith("_asc"):
                field_name = order_by[:-4]
                field = getattr(self.model, field_name, None)
                if field is not None and isinstance(field, InstrumentedAttribute):
                    stmt = stmt.order_by(asc(field))
            else: # Default to ascending if no suffix
                field = getattr(self.model, order_by, None)
                if field is not None and isinstance(field, InstrumentedAttribute):
                    stmt = stmt.order_by(asc(field))

        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())


    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record.
        """
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update an existing record.
        """
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: int) -> ModelType:
        """
        Delete a record by ID.
        """
        stmt = select(self.model).where(self.model.id == id)
        result = await db.execute(stmt)
        obj = result.scalar_one_or_none()
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj # type: ignore
```

#### `app/crud/user.py` (Example of specific CRUD)
```python