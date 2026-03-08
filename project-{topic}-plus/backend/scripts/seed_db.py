```python
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRoomAssociation
from app.models.chat_room import ChatRoom
from app.models.message import Message
from app.models.base import Base # Import Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data():
    """
    Seeds the database with initial users, chat rooms, and messages.
    """
    async with engine.begin() as conn:
        # This is for testing/development. In production, use Alembic for schema management.
        # await conn.run_sync(Base.metadata.drop_all)
        # await conn.run_sync(Base.metadata.create_all)
        logger.info("Ensuring database schema is up-to-date (via Alembic, if run).")
        # If you run `alembic upgrade head` before this script, tables will exist.
        # If not, you might need `await conn.run_sync(Base.metadata.create_all)`
        # but `drop_all` is risky in production.

    async with AsyncSessionLocal() as db:
        logger.info("Seeding users...")
        users_data = [
            {"username": "testuser1", "email": "test1@example.com", "password": "password123", "full_name": "Test User One"},
            {"username": "testuser2", "email": "test2@example.com", "password": "password123", "full_name": "Test User Two"},
            {"username": "chatterbox", "email": "chatter@example.com", "password": "password123", "full_name": "Mr. Chatterbox"},
        ]
        
        seeded_users = {}
        for user_in in users_data:
            existing_user = await db.execute(User.__table__.select().where(User.username == user_in["username"]))
            if existing_user.scalar_one_or_none():
                logger.info(f"User '{user_in['username']}' already exists. Skipping.")
                user_obj = (await db.execute(User.__table__.select().where(User.username == user_in["username"]))).scalar_one()
                seeded_users[user_in["username"]] = user_obj
                continue

            hashed_password = get_password_hash(user_in["password"])
            user = User(
                username=user_in["username"],
                email=user_in["email"],
                hashed_password=hashed_password,
                full_name=user_in["full_name"],
                is_active=True
            )
            db.add(user)
            await db.flush() # Flush to get user.id
            seeded_users[user_in["username"]] = user
            logger.info(f"Seeded user: {user.username}")
        await db.commit()

        user1 = seeded_users["testuser1"]
        user2 = seeded_users["testuser2"]
        chatterbox = seeded_users["chatterbox"]

        logger.info("Seeding chat rooms...")
        rooms_data = [
            {"name": "general", "description": "General discussions for everyone.", "is_private": False, "owner_id": user1.id},
            {"name": "dev-talk", "description": "Discussions about development.", "is_private": False, "owner_id": user2.id},
            {"name": "private-club", "description": "Exclusive club for cool people.", "is_private": True, "owner_id": user1.id},
        ]
        
        seeded_rooms = {}
        for room_in in rooms_data:
            existing_room = await db.execute(ChatRoom.__table__.select().where(ChatRoom.name == room_in["name"]))
            if existing_room.scalar_one_or_none():
                logger.info(f"Room '{room_in['name']}' already exists. Skipping.")
                room_obj = (await db.execute(ChatRoom.__table__.select().where(ChatRoom.name == room_in["name"]))).scalar_one()
                seeded_rooms[room_in["name"]] = room_obj
                continue

            room = ChatRoom(**room_in)
            db.add(room)
            await db.flush() # Flush to get room.id
            seeded_rooms[room_in["name"]] = room
            logger.info(f"Seeded room: {room.name}")
        await db.commit()

        general_room = seeded_rooms["general"]
        dev_room = seeded_rooms["dev-talk"]
        private_room = seeded_rooms["private-club"]

        logger.info("Seeding room memberships...")
        memberships_data = [
            (user1, general_room), (user2, general_room), (chatterbox, general_room),
            (user1, dev_room), (user2, dev_room),
            (user1, private_room), # Only owner is member of private room initially
        ]

        for user, room in memberships_data:
            existing_assoc = await db.execute(
                UserRoomAssociation.__table__.select().where(
                    (UserRoomAssociation.user_id == user.id) &
                    (UserRoomAssociation.room_id == room.id)
                )
            )
            if existing_assoc.scalar_one_or_none():
                logger.debug(f"User {user.username} already member of {room.name}. Skipping.")
                continue

            assoc = UserRoomAssociation(user_id=user.id, room_id=room.id)
            db.add(assoc)
            logger.info(f"Added {user.username} to {room.name}")
        await db.commit()

        logger.info("Seeding messages...")
        messages_data = [
            {"chat_room_id": general_room.id, "sender_id": user1.id, "content": "Hello everyone in General!"},
            {"chat_room_id": general_room.id, "sender_id": user2.id, "content": "Hi testuser1! How's it going?"},
            {"chat_room_id": general_room.id, "sender_id": chatterbox.id, "content": "Chatterbox has entered the chat!"},
            {"chat_room_id": dev_room.id, "sender_id": user1.id, "content": "Any thoughts on async Python for microservices?"},
            {"chat_room_id": dev_room.id, "sender_id": user2.id, "content": "FastAPI is excellent for that, paired with SQLAlchemy async."},
            {"chat_room_id": private_room.id, "sender_id": user1.id, "content": "Shhh, this is a secret message."},
        ]

        for msg_in in messages_data:
            # Simple check for duplicates, might not be robust for real data
            existing_msg = await db.execute(
                Message.__table__.select().where(
                    (Message.chat_room_id == msg_in["chat_room_id"]) &
                    (Message.sender_id == msg_in["sender_id"]) &
                    (Message.content == msg_in["content"])
                )
            )
            if existing_msg.scalar_one_or_none():
                logger.debug(f"Message already exists. Skipping.")
                continue

            message = Message(**msg_in)
            db.add(message)
            logger.info(f"Seeded message to room {message.chat_room_id} from {message.sender_id}")
        await db.commit()

    logger.info("Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_data())
```