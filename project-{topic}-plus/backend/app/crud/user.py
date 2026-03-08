```python
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload # For eagerly loading relationships

from app.crud.base import CRUDBase
from app.models.user import User, UserRoomAssociation
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """
    CRUD operations for User model.
    Extends CRUDBase with user-specific methods.
    """
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """
        Retrieve a user by their email address.
        """
        stmt = select(self.model).where(self.model.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, *, username: str) -> Optional[User]:
        """
        Retrieve a user by their username.
        """
        stmt = select(self.model).where(self.model.username == username)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi_with_rooms(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Retrieve multiple users with their associated chat rooms, eager loading the relationships.
        """
        stmt = (
            select(self.model)
            .options(
                selectinload(self.model.chat_rooms),
                selectinload(self.model.created_chat_rooms)
            )
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    async def get_user_rooms(self, db: AsyncSession, user_id: int) -> List[UserRoomAssociation]:
        """
        Get all room associations for a given user, eagerly loading room details.
        """
        stmt = (
            select(UserRoomAssociation)
            .where(UserRoomAssociation.user_id == user_id)
            .options(selectinload(UserRoomAssociation.room))
        )
        result = await db.execute(stmt)
        return result.scalars().all()


crud_user = CRUDUser(User)
```