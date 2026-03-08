```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_active_user
from app.schemas.chat_room import ChatRoomCreate, ChatRoomPublic, ChatRoomUpdate
from app.models.user import User
from app.services.chat import chat_service # Import chat service

router = APIRouter()

@router.post("/", response_model=ChatRoomPublic, status_code=status.HTTP_201_CREATED)
async def create_chat_room(
    room_in: ChatRoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new chat room. The current authenticated user becomes the owner and a member.
    - **name**: Unique name for the chat room.
    - **description**: Optional description.
    - **is_private**: Boolean indicating if the room is private (default: false).
    (Requires authentication)
    """
    room = await chat_service.create_room(db, room_in, current_user)
    # Refresh the room to load owner and members relationships correctly for serialization
    await db.refresh(room, attribute_names=["owner", "members"])
    return ChatRoomPublic.model_validate(room)

@router.get("/", response_model=List[ChatRoomPublic])
async def read_public_chat_rooms(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Still requires auth to list rooms
):
    """
    Retrieve a list of public chat rooms.
    (Requires authentication)
    """
    rooms = await chat_service.get_public_rooms(db, skip=skip, limit=limit)
    return [ChatRoomPublic.model_validate(room) for room in rooms]

@router.get("/{room_id}", response_model=ChatRoomPublic)
async def read_chat_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve details of a specific chat room.
    Includes owner and member information.
    For private rooms, current user must be owner or a member.
    (Requires authentication)
    """
    room = await chat_service.get_room(db, room_id, current_user)
    return ChatRoomPublic.model_validate(room)

@router.patch("/{room_id}", response_model=ChatRoomPublic)
async def update_chat_room(
    room_id: int,
    room_update: ChatRoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing chat room. Only the room owner can update it.
    (Requires authentication, Owner only)
    """
    room = await chat_service.update_room(db, room_id, room_update, current_user)
    # Refresh the room to load owner and members relationships correctly for serialization
    await db.refresh(room, attribute_names=["owner", "members"])
    return ChatRoomPublic.model_validate(room)

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a chat room. Only the room owner can delete it.
    (Requires authentication, Owner only)
    """
    await chat_service.delete_room(db, room_id, current_user)
    return {"message": "Chat room deleted successfully"}

@router.post("/{room_id}/join", response_model=ChatRoomPublic)
async def join_chat_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Join a chat room. Current user becomes a member.
    Cannot join private rooms without specific invites (future feature).
    (Requires authentication)
    """
    room = await chat_service.join_room(db, room_id, current_user)
    # Refresh the room to load owner and members relationships correctly for serialization
    await db.refresh(room, attribute_names=["owner", "members"])
    return ChatRoomPublic.model_validate(room)

@router.post("/{room_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_chat_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Leave a chat room. Current user is removed from members.
    Owner cannot leave their own room if they are the only member.
    (Requires authentication)
    """
    await chat_service.leave_room(db, room_id, current_user)
    return {"message": "Successfully left chat room"}

```