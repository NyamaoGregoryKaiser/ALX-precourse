```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.dependencies import get_current_user
from backend.app.core.database import get_db
from backend.app.services.websocket_manager import manager
from backend.app.crud.chat import chat as crud_chat
import json
from backend.app.core.logger import app_logger

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_id: int,
    token: str, # Passed as query parameter or header for auth
    db: AsyncSession = Depends(get_db) # Cannot use Depends directly in WebSocket path
):
    user = await get_current_user(db=db, token=token)
    if not user:
        app_logger.warning(f"WebSocket connection attempt with invalid token to chat {chat_id}.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    if not await crud_chat.is_user_in_chat(db, chat_id=chat_id, user_id=user.id):
        app_logger.warning(f"User {user.id} attempted to connect to unauthorized chat {chat_id}.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this chat.")

    await manager.connect(websocket, user.id)
    await manager.join_chat_room(websocket, chat_id)
    app_logger.info(f"User {user.id} connected to WebSocket for chat {chat_id}.")

    try:
        while True:
            data = await websocket.receive_text()
            app_logger.debug(f"Received message from user {user.id} in chat {chat_id}: {data}")

            # Optionally process incoming WebSocket messages (e.g., typing indicators, read receipts)
            # For a simple chat, messages are sent via REST and broadcasted here.
            # Example for future expansion:
            # message_payload = json.loads(data)
            # if message_payload.get("type") == "typing":
            #     await manager.broadcast_to_chat(chat_id, json.dumps({
            #         "type": "typing",
            #         "user_id": user.id,
            #         "username": user.username
            #     }))

    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
        await manager.leave_chat_room(websocket, chat_id)
        app_logger.info(f"User {user.id} disconnected from WebSocket in chat {chat_id}.")
    except Exception as e:
        app_logger.exception(f"WebSocket error for user {user.id} in chat {chat_id}: {e}")
        manager.disconnect(websocket, user.id)
        await manager.leave_chat_room(websocket, chat_id)
```