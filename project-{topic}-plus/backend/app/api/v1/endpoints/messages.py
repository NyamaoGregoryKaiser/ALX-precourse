```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_active_user
from app.schemas.message import MessagePublic, MessageCreate
from app.models.user import User
from app.services.chat import chat_service

router = APIRouter()

@router.post("/{room_id}", response_model=MessagePublic, status_code=status.HTTP_201_CREATED)
async def send_message_to_room(
    room_id: int,
    message_in: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send a message to a specific chat room.
    The current user must be a member of the room.
    The message will be broadcast to all connected WebSocket clients in that room.
    (Requires authentication)
    """
    message = await chat_service.send_message(db, room_id, current_user, message_in)
    return message

@router.get("/{room_id}", response_model=List[MessagePublic])
async def get_message_history(
    room_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve message history for a specific chat room.
    The current user must be a member or owner of the room (if private).
    (Requires authentication)
    """
    messages = await chat_service.get_room_messages(db, room_id, current_user, skip=skip, limit=limit)
    return messages

```