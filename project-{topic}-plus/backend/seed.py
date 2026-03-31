```python
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import AsyncSessionLocal, engine, Base
from backend.app.crud.user import user as crud_user
from backend.app.crud.chat import chat as crud_chat
from backend.app.crud.message import message as crud_message
from backend.app.schemas.user import UserCreate
from backend.app.schemas.chat import ChatCreate
from backend.app.schemas.message import MessageBase
from backend.app.core.logger import app_logger
from backend.app.core.security import get_password_hash # Import for direct seeding

async def seed_data():
    app_logger.info("Starting database seeding...")
    async with AsyncSessionLocal() as db:
        # Create users
        user1 = await crud_user.get_by_email(db, email="alice@example.com")
        if not user1:
            user1 = await crud_user.create(db, obj_in=UserCreate(username="alice", email="alice@example.com", password="password123"))
            app_logger.info("Created user: Alice")

        user2 = await crud_user.get_by_email(db, email="bob@example.com")
        if not user2:
            user2 = await crud_user.create(db, obj_in=UserCreate(username="bob", email="bob@example.com", password="password123"))
            app_logger.info("Created user: Bob")

        user3 = await crud_user.get_by_email(db, email="charlie@example.com")
        if not user3:
            user3 = await crud_user.create(db, obj_in=UserCreate(username="charlie", email="charlie@example.com", password="password123"))
            app_logger.info("Created user: Charlie")

        # Create a group chat
        group_chat = await crud_chat.get(db, id=1) # Assuming first chat has ID 1 if exists
        if not group_chat:
            group_chat = await crud_chat.create_chat_with_members(
                db,
                obj_in=ChatCreate(name="General Chat", is_group=True, member_ids=[user1.id, user2.id, user3.id]),
                creator_id=user1.id
            )
            app_logger.info(f"Created group chat: {group_chat.name}")
            
            # Add some messages to the group chat
            await crud_message.create(db, obj_in={"chat_id": group_chat.id, "owner_id": user1.id, "content": "Hi everyone!"})
            await crud_message.create(db, obj_in={"chat_id": group_chat.id, "owner_id": user2.id, "content": "Hello Alice and Charlie!"})
            await crud_message.create(db, obj_in={"chat_id": group_chat.id, "owner_id": user3.id, "content": "Hey team!"})
            app_logger.info(f"Added messages to group chat: {group_chat.name}")
        
        # Create a DM chat (if not exists, this logic needs refinement for proper DM creation)
        # For a true DM, usually you'd check if a chat with exactly two specific members already exists.
        dm_chat = await crud_chat.get_dm_chat_between_users(db, user1.id, user2.id)
        if not dm_chat:
            dm_chat = await crud_chat.create_chat_with_members(
                db,
                obj_in=ChatCreate(name=f"DM between {user1.username} and {user2.username}", is_group=False, member_ids=[user1.id, user2.id]),
                creator_id=user1.id # Creator is also a member
            )
            app_logger.info(f"Created DM chat: {dm_chat.name}")
            
            await crud_message.create(db, obj_in={"chat_id": dm_chat.id, "owner_id": user1.id, "content": "Hey Bob, how's it going?"})
            await crud_message.create(db, obj_in={"chat_id": dm_chat.id, "owner_id": user2.id, "content": "Pretty good, Alice! You?"})
            app_logger.info(f"Added messages to DM chat: {dm_chat.name}")

    app_logger.info("Database seeding complete.")

if __name__ == "__main__":
    # This will typically run after migrations have been applied
    # Ensure DATABASE_URL is set in the environment or .env file
    asyncio.run(seed_data())
```