```python
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageUpdate

class CRUDMessage(CRUDBase[Message, MessageCreate, MessageUpdate]):
    """
    CRUD operations for Message model.
    Extends CRUDBase with message-specific methods.
    """
    async def get_messages_for_room(
        self, db: AsyncSession, room_id: int, *, skip: int = 0, limit: int = 50
    ) -> List[Message]:
        """
        Retrieve messages for a specific chat room, ordered by creation time,
        with sender details eagerly loaded.
        """
        stmt = (
            select(self.model)
            .where(self.model.chat_room_id == room_id)
            .options(selectinload(self.model.sender)) # Eager load sender details
            .order_by(self.model.sent_at)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    async def create_message(
        self, db: AsyncSession, *, obj_in: MessageCreate, room_id: int, sender_id: int
    ) -> Message:
        """
        Create a new message with explicit room and sender IDs.
        """
        db_obj = self.model(
            **obj_in.model_dump(),
            chat_room_id=room_id,
            sender_id=sender_id
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Load sender relationship after refresh for consistency with get_messages_for_room
        await db.execute(select(Message).options(selectinload(Message.sender)).filter(Message.id == db_obj.id))
        return db_obj


crud_message = CRUDMessage(Message)
```