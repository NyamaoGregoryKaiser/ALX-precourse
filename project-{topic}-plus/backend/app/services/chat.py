```python
import json
import logging
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.user import crud_user
from app.crud.chat_room import crud_chat_room
from app.crud.message import crud_message
from app.models.user import User
from app.models.chat_room import ChatRoom
from app.models.message import Message
from app.schemas.chat_room import ChatRoomCreate, ChatRoomUpdate
from app.schemas.message import MessageCreate, MessagePublic
from app.services.websocket_manager import websocket_manager # Import manager
from app.schemas.user import UserPublic # For serializing sender

logger = logging.getLogger(__name__)

class ChatService:
    """
    Service layer for chat room and message related business logic.
    Interacts with CRUD operations and WebSocket manager.
    """
    async def create_room(self, db: AsyncSession, room_in: ChatRoomCreate, owner: User) -> ChatRoom:
        """
        Creates a new chat room and adds the owner as the first member.
        """
        existing_room = await crud_chat_room.get_by_name(db, name=room_in.name)
        if existing_room:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat room with this name already exists")

        room_data = room_in.model_dump()
        room_data["owner_id"] = owner.id
        chat_room = await crud_chat_room.create(db, obj_in=room_data)

        # Add the owner as a member
        await crud_chat_room.add_member(db, room=chat_room, user=owner)

        logger.info(f"User {owner.username} created chat room: {chat_room.name} (ID: {chat_room.id})")
        return chat_room

    async def get_room(self, db: AsyncSession, room_id: int, current_user: User) -> ChatRoom:
        """
        Retrieves a chat room, ensuring the current user has access.
        """
        room = await crud_chat_room.get_room_with_details(db, room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")

        # If private, ensure user is a member or owner
        if room.is_private:
            is_owner = room.owner_id == current_user.id
            is_member = await crud_chat_room.is_member(db, room_id, current_user.id)
            if not is_owner and not is_member:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this private chat room")
        return room

    async def get_public_rooms(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[ChatRoom]:
        """
        Retrieves a list of public chat rooms.
        """
        return await crud_chat_room.get_multi_public(db, skip=skip, limit=limit)

    async def update_room(self, db: AsyncSession, room_id: int, room_update: ChatRoomUpdate, current_user: User) -> ChatRoom:
        """
        Updates a chat room, ensuring the current user is the owner.
        """
        room = await crud_chat_room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")
        if room.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this chat room")

        updated_room = await crud_chat_room.update(db, db_obj=room, obj_in=room_update)
        logger.info(f"User {current_user.username} updated chat room: {updated_room.name} (ID: {updated_room.id})")
        return updated_room

    async def delete_room(self, db: AsyncSession, room_id: int, current_user: User) -> None:
        """
        Deletes a chat room, ensuring the current user is the owner.
        """
        room = await crud_chat_room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")
        if room.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this chat room")

        await crud_chat_room.remove(db, id=room_id)
        logger.info(f"User {current_user.username} deleted chat room: {room.name} (ID: {room.id})")

    async def join_room(self, db: AsyncSession, room_id: int, current_user: User) -> ChatRoom:
        """
        Adds the current user to a chat room's members.
        Handles checks for private rooms and existing membership.
        """
        room = await crud_chat_room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")

        is_member = await crud_chat_room.is_member(db, room_id, current_user.id)
        if is_member:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already a member of this room")

        # For private rooms, a specific invitation/request logic might be needed.
        # For now, let's assume if it's private, you can't just join via API without being explicitly added (future feature)
        # Or, if you're the owner, you can always join.
        if room.is_private and room.owner_id != current_user.id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot join private rooms without explicit invite (future feature)")


        await crud_chat_room.add_member(db, room=room, user=current_user)
        logger.info(f"User {current_user.username} joined chat room: {room.name} (ID: {room.id})")

        # Notify room members that a new user joined
        join_message = {
            "type": "system",
            "content": f"{current_user.username} has joined the room.",
            "room_id": room.id,
            "user": UserPublic.model_validate(current_user).model_dump_json(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await websocket_manager.broadcast_to_room(room.id, json.dumps(join_message))

        await db.refresh(room, attribute_names=["members"]) # Refresh to include new member
        return room

    async def leave_room(self, db: AsyncSession, room_id: int, current_user: User) -> None:
        """
        Removes the current user from a chat room's members.
        """
        room = await crud_chat_room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")

        is_member = await crud_chat_room.is_member(db, room_id, current_user.id)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a member of this room")

        # Prevent owner from leaving their own room if they are the only member
        # or if the room cannot exist without an owner (design decision)
        if room.owner_id == current_user.id and len(room.members) == 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot leave their own room if they are the only member.")


        removed = await crud_chat_room.remove_member(db, room=room, user=current_user)
        if not removed:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to remove user from room")

        logger.info(f"User {current_user.username} left chat room: {room.name} (ID: {room.id})")

        # Notify room members that a user left
        leave_message = {
            "type": "system",
            "content": f"{current_user.username} has left the room.",
            "room_id": room.id,
            "user": UserPublic.model_validate(current_user).model_dump_json(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await websocket_manager.broadcast_to_room(room.id, json.dumps(leave_message))


    async def send_message(self, db: AsyncSession, room_id: int, sender: User, message_in: MessageCreate) -> MessagePublic:
        """
        Sends a message to a chat room and broadcasts it via WebSockets.
        """
        room = await crud_chat_room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")

        is_member = await crud_chat_room.is_member(db, room_id, sender.id)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this room, cannot send messages")

        message = await crud_message.create_message(db, obj_in=message_in, room_id=room_id, sender_id=sender.id)

        # Convert ORM model to Pydantic schema for consistent output
        message_public = MessagePublic.model_validate(message)
        logger.debug(f"Message created: {message_public.model_dump_json()}")

        # Broadcast the message to all connected clients in the room
        await websocket_manager.broadcast_to_room(room_id, message_public.model_dump_json())

        logger.info(f"User {sender.username} sent message to room {room_id}")
        return message_public

    async def get_room_messages(self, db: AsyncSession, room_id: int, current_user: User, skip: int = 0, limit: int = 50) -> List[MessagePublic]:
        """
        Retrieves message history for a chat room, ensuring user access.
        """
        room = await crud_chat_room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")

        is_member = await crud_chat_room.is_member(db, room_id, current_user.id)
        is_owner = room.owner_id == current_user.id

        if room.is_private and not is_member and not is_owner:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view messages in this private chat room")

        messages = await crud_message.get_messages_for_room(db, room_id, skip=skip, limit=limit)
        return [MessagePublic.model_validate(msg) for msg in messages]

chat_service = ChatService()
```