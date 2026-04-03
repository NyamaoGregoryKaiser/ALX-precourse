from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """
        Retrieve a user by their email address.
        """
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        """
        Create a new user with hashed password.
        """
        hashed_password = get_password_hash(obj_in.password)
        db_obj = User(
            email=obj_in.email,
            hashed_password=hashed_password,
            full_name=obj_in.full_name,
            is_active=True, # New users are active by default
            is_superuser=False # New users are not superusers by default
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate
    ) -> User:
        """
        Update a user, including hashing the new password if provided.
        """
        if obj_in.password:
            obj_in.password = get_password_hash(obj_in.password)
        return await super().update(db, db_obj=db_obj, obj_in=obj_in)

    async def get_multi_by_is_active(
        self, db: AsyncSession, *, is_active: bool = True, skip: int = 0, limit: int = 100
    ) -> List[User]:
        """
        Retrieve multiple users filtered by their active status.
        """
        result = await db.execute(
            select(self.model)
            .where(self.model.is_active == is_active)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

crud_user = CRUDUser(User)