```python
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from backend.app.crud.base import CRUDBase
from backend.app.models.chat import Chat, ChatMember
from backend.app.schemas.chat import ChatCreate, ChatUpdate

class CRUDChat(CRUDBase[Chat, ChatCreate, ChatUpdate]):
    async def create_chat_with_members(self, db: AsyncSession, *, obj_in: ChatCreate, creator_id: int) -> Chat:
        chat_data = obj_in.model_dump(exclude={"member_ids"})
        db_chat = self.model(**chat_data)
        db.add(db_chat)
        await db.flush() # Flush to get db_chat.id

        member_ids = set(obj_in.member_ids)
        member_ids.add(creator_id) # Ensure creator is always a member

        for user_id in member_ids:
            db_chat_member = ChatMember(chat_id=db_chat.id, user_id=user_id)
            db.add(db_chat_member)

        await db.commit()
        await db.refresh(db_chat, attribute_names=["members"]) # Refresh to load members
        return db_chat

    async def get_user_chats(self, db: AsyncSession, user_id: int) -> List[Chat]:
        stmt = (
            select(Chat)
            .join(ChatMember)
            .where(ChatMember.user_id == user_id)
            .options(selectinload(Chat.members).selectinload(ChatMember.user))
            .order_by(Chat.updated_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    async def get_chat_by_id_for_user(self, db: AsyncSession, chat_id: int, user_id: int) -> Optional[Chat]:
        stmt = (
            select(Chat)
            .join(ChatMember)
            .where(and_(Chat.id == chat_id, ChatMember.user_id == user_id))
            .options(selectinload(Chat.members).selectinload(ChatMember.user))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def is_user_in_chat(self, db: AsyncSession, chat_id: int, user_id: int) -> bool:
        stmt = (
            select(ChatMember)
            .where(and_(ChatMember.chat_id == chat_id, ChatMember.user_id == user_id))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_dm_chat_between_users(self, db: AsyncSession, user1_id: int, user2_id: int) -> Optional[Chat]:
        # Find a non-group chat (DM) that has exactly these two members.
        # This is a bit complex and might need specific indexing or a more direct approach for performance.
        # For simplicity, we'll check existing chats.
        stmt = (
            select(Chat)
            .where(Chat.is_group == False)
            .join(ChatMember)
            .group_by(Chat.id)
            .having(
                func.count(ChatMember.user_id) == 2,
                func.sum(case((ChatMember.user_id == user1_id, 1), else_=0)) == 1,
                func.sum(case((ChatMember.user_id == user2_id, 1), else_=0)) == 1,
            )
            .options(selectinload(Chat.members).selectinload(ChatMember.user))
        )
        from sqlalchemy import case, func # Local import to avoid circular dependency if placed globally

        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def add_member_to_chat(self, db: AsyncSession, chat_id: int, user_id: int) -> Optional[ChatMember]:
        if not await self.is_user_in_chat(db, chat_id, user_id):
            db_chat_member = ChatMember(chat_id=chat_id, user_id=user_id)
            db.add(db_chat_member)
            await db.commit()
            await db.refresh(db_chat_member)
            return db_chat_member
        return None

    async def remove_member_from_chat(self, db: AsyncSession, chat_id: int, user_id: int) -> bool:
        stmt = select(ChatMember).where(and_(ChatMember.chat_id == chat_id, ChatMember.user_id == user_id))
        result = await db.execute(stmt)
        db_chat_member = result.scalar_one_or_none()
        if db_chat_member:
            await db.delete(db_chat_member)
            await db.commit()
            return True
        return False

chat = CRUDChat(Chat)
```