```python
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload # For eagerly loading relationships

from app.crud.base import CRUDBase
from app.models.chat_room import ChatRoom
from app.models.user import UserRoomAssociation, User
from app.schemas.chat_room import ChatRoomCreate, ChatRoomUpdate

class CRUDChatRoom(CRUDBase[ChatRoom, ChatRoomCreate, ChatRoomUpdate]):
    """
    CRUD operations for ChatRoom model.
    Extends CRUDBase with chat room-specific methods.
    """
    async def get_by_name(self, db: AsyncSession, *, name: str) -> Optional[ChatRoom]:
        """
        Retrieve a chat room by its name.
        """
        stmt = select(self.model).where(self.model.name == name)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi_public(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[ChatRoom]:
        """
        Retrieve multiple public chat rooms, eagerly loading owner and members.
        """
        stmt = (
            select(self.model)
            .where(self.model.is_private == False)
            .options(
                selectinload(self.model.owner),
                selectinload(self.model.members) # Eager load members
            )
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().unique().all() # .unique() handles duplicate rooms due to multiple members

    async def get_room_with_details(self, db: AsyncSession, room_id: int) -> Optional[ChatRoom]:
        """
        Retrieve a single chat room with its owner and members eagerly loaded.
        """
        stmt = (
            select(self.model)
            .where(self.model.id == room_id)
            .options(
                selectinload(self.model.owner),
                selectinload(self.model.members)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def add_member(self, db: AsyncSession, room: ChatRoom, user: User) -> UserRoomAssociation:
        """
        Adds a user as a member to a chat room.
        """
        association = UserRoomAssociation(user_id=user.id, room_id=room.id)
        db.add(association)
        await db.commit()
        await db.refresh(association)
        return association

    async def remove_member(self, db: AsyncSession, room: ChatRoom, user: User) -> bool:
        """
        Removes a user from a chat room.
        Returns True if removed, False otherwise (e.g., if user wasn't a member).
        """
        stmt = select(UserRoomAssociation).where(
            UserRoomAssociation.user_id == user.id,
            UserRoomAssociation.room_id == room.id
        )
        result = await db.execute(stmt)
        association = result.scalar_one_or_none()
        if association:
            await db.delete(association)
            await db.commit()
            return True
        return False

    async def is_member(self, db: AsyncSession, room_id: int, user_id: int) -> bool:
        """
        Checks if a user is a member of a given chat room.
        """
        stmt = select(UserRoomAssociation).where(
            UserRoomAssociation.user_id == user_id,
            UserRoomAssociation.room_id == room_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

crud_chat_room = CRUDChatRoom(ChatRoom)
```