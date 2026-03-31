```python
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.app.crud.base import CRUDBase
from backend.app.models.message import Message
from backend.app.schemas.message import MessageCreate, MessageUpdate

class CRUDMessage(CRUDBase[Message, MessageCreate, MessageUpdate]):
    async def get_messages_by_chat_id(self, db: AsyncSession, chat_id: int, skip: int = 0, limit: int = 50) -> List[Message]:
        stmt = (
            select(self.model)
            .where(self.model.chat_id == chat_id)
            .options(selectinload(self.model.owner))
            .order_by(self.model.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

message = CRUDMessage(Message)
```