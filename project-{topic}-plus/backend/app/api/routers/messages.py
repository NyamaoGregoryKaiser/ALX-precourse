```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from backend.app.core.database import get_db
from backend.app.schemas.message import Message, MessageBase
from backend.app.crud.message import message as crud_message
from backend.app.crud.chat import chat as crud_chat
from backend.app.api.dependencies import get_current_active_user
from backend.app.models.user import User
from backend.app.services.websocket_manager import manager
import json
from backend.app.core.logger import app_logger

router = APIRouter(prefix="/messages", tags=["messages"])

@router.post("/", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_in: MessageBase,
    chat_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a new message to a chat.
    """
    app_logger.info(f"User {current_user.id} sending message to chat {chat_id}.")
    if not await crud_chat.is_user_in_chat(db, chat_id=chat_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to send messages to this chat.")

    message_create_data = {
        "chat_id": chat_id,
        "owner_id": current_user.id,
        "content": message_in.content
    }
    try:
        new_message = await crud_message.create(db, obj_in=message_create_data) # Pass dict directly
        await db.refresh(new_message, attribute_names=["owner"]) # Load owner
        app_logger.info(f"Message {new_message.id} sent by user {current_user.id} to chat {chat_id}.")

        # Send message via WebSocket to all connected clients in the chat room
        message_data = Message.model_validate(new_message).model_dump_json()
        await manager.broadcast_to_chat(chat_id, message_data)

        return new_message
    except Exception as e:
        app_logger.exception(f"Failed to send message for user {current_user.id} to chat {chat_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not send message."
        )

@router.get("/chat/{chat_id}", response_model=List[Message])
async def get_messages_in_chat(
    chat_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve messages for a specific chat.
    """
    app_logger.info(f"User {current_user.id} fetching messages for chat {chat_id}.")
    if not await crud_chat.is_user_in_chat(db, chat_id=chat_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view messages in this chat.")

    messages = await crud_message.get_messages_by_chat_id(db, chat_id=chat_id, skip=skip, limit=limit)
    return messages
```