```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from backend.app.core.database import get_db
from backend.app.schemas.chat import Chat, ChatCreate, ChatUpdate
from backend.app.crud.chat import chat as crud_chat
from backend.app.api.dependencies import get_current_active_user
from backend.app.models.user import User
from backend.app.core.logger import app_logger

router = APIRouter(prefix="/chats", tags=["chats"])

@router.post("/", response_model=Chat, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_in: ChatCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new chat (group or direct message).
    """
    app_logger.info(f"User {current_user.id} attempting to create chat: {chat_in.name}")
    try:
        new_chat = await crud_chat.create_chat_with_members(db, obj_in=chat_in, creator_id=current_user.id)
        app_logger.info(f"Chat {new_chat.id} created by user {current_user.id}.")
        return new_chat
    except Exception as e:
        app_logger.exception(f"Failed to create chat for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create chat."
        )

@router.get("/", response_model=List[Chat])
async def get_user_chats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all chats for the current user.
    """
    app_logger.info(f"User {current_user.id} fetching their chats.")
    chats = await crud_chat.get_user_chats(db, user_id=current_user.id)
    return chats

@router.get("/{chat_id}", response_model=Chat)
async def get_chat_by_id(
    chat_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific chat by ID, ensuring the current user is a member.
    """
    app_logger.info(f"User {current_user.id} fetching chat {chat_id}.")
    chat = await crud_chat.get_chat_by_id_for_user(db, chat_id=chat_id, user_id=current_user.id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or user not a member.")
    return chat

@router.put("/{chat_id}", response_model=Chat)
async def update_chat(
    chat_id: int,
    chat_in: ChatUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a chat's details. (Requires user to be a member and potentially an admin in future)
    """
    app_logger.info(f"User {current_user.id} updating chat {chat_id}.")
    db_chat = await crud_chat.get_chat_by_id_for_user(db, chat_id=chat_id, user_id=current_user.id)
    if not db_chat:
        raise HTTPException(status_code=404, detail="Chat not found or user not a member.")

    try:
        updated_chat = await crud_chat.update(db, db_obj=db_chat, obj_in=chat_in)
        app_logger.info(f"Chat {chat_id} updated by user {current_user.id}.")
        return updated_chat
    except Exception as e:
        app_logger.exception(f"Failed to update chat {chat_id} by user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update chat."
        )

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a chat. (Requires user to be a creator/admin in future)
    For now, only a member can delete. This should be refined.
    """
    app_logger.info(f"User {current_user.id} attempting to delete chat {chat_id}.")
    if not await crud_chat.is_user_in_chat(db, chat_id=chat_id, user_id=current_user.id):
        raise HTTPException(status_code=404, detail="Chat not found or user not authorized.")

    try:
        await crud_chat.remove(db, id=chat_id)
        app_logger.info(f"Chat {chat_id} deleted by user {current_user.id}.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        app_logger.exception(f"Failed to delete chat {chat_id} by user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete chat."
        )

@router.post("/{chat_id}/members/{user_id}", response_model=Chat, status_code=status.HTTP_200_OK)
async def add_member_to_chat(
    chat_id: int,
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a user to a chat. (Requires current_user to be an admin or existing member)
    """
    app_logger.info(f"User {current_user.id} attempting to add user {user_id} to chat {chat_id}.")
    if not await crud_chat.is_user_in_chat(db, chat_id=chat_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this chat.")

    if await crud_chat.add_member_to_chat(db, chat_id=chat_id, user_id=user_id):
        updated_chat = await crud_chat.get_chat_by_id_for_user(db, chat_id=chat_id, user_id=current_user.id)
        app_logger.info(f"User {user_id} added to chat {chat_id} by user {current_user.id}.")
        return updated_chat
    raise HTTPException(status_code=400, detail="User is already a member of this chat or chat not found.")
```