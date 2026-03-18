```python
from typing import Any, Generic, TypeVar, Self
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.core.exceptions import DuplicateEntryException, NotFoundException

ModelType = TypeVar("ModelType", bound=Any)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base class for CRUD operations.
    Handles basic create, read, update, delete for a given SQLAlchemy model.
    """
    def __init__(self, model: type[ModelType]):
        """
        :param model: A SQLAlchemy model class
        """
        self.model = model

    async def get(self, db: AsyncSession, id: UUID) -> ModelType | None:
        """Retrieve a single record by ID."""
        result = await db.execute(select(self.model).filter(self.model.id == id))
        return result.scalars().first()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> list[ModelType]:
        """Retrieve multiple records."""
        result = await db.execute(
            select(self.model).offset(skip).limit(limit).order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType, owner_id: UUID | None = None) -> ModelType:
        """Create a new record."""
        obj_in_data = obj_in.model_dump()
        if owner_id:
            obj_in_data["owner_id"] = owner_id

        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        try:
            await db.commit()
            await db.refresh(db_obj)
        except IntegrityError as e:
            await db.rollback()
            if "duplicate key value" in str(e):
                raise DuplicateEntryException(
                    detail=f"A {self.model.__tablename__.singularize()} with the provided unique field already exists."
                ) from e
            raise # Re-raise other integrity errors
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType | dict[str, Any]
    ) -> ModelType:
        """Update an existing record."""
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True) # Only update fields provided

        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        try:
            await db.commit()
            await db.refresh(db_obj)
        except IntegrityError as e:
            await db.rollback()
            if "duplicate key value" in str(e):
                raise DuplicateEntryException(
                    detail=f"A {self.model.__tablename__.singularize()} with the provided unique field already exists."
                ) from e
            raise
        return db_obj

    async def remove(self, db: AsyncSession, *, id: UUID) -> ModelType | None:
        """Delete a record by ID."""
        obj = await db.get(self.model, id)
        if not obj:
            return None
        await db.delete(obj)
        await db.commit()
        return obj

    async def get_by_field(self, db: AsyncSession, *, field_name: str, field_value: Any) -> ModelType | None:
        """Retrieve a record by a specific field."""
        result = await db.execute(select(self.model).filter(getattr(self.model, field_name) == field_value))
        return result.scalars().first()

    # Helper method for singularizing table names (often used in error messages)
    def __getattr__(self, name: str) -> Any:
        if name == "__tablename__.singularize":
            # Simple singularization (not perfect for all cases, but good enough for this context)
            return lambda: self.model.__tablename__[:-1] if self.model.__tablename__.endswith('s') else self.model.__tablename__
        return super().__getattr__(name)

```