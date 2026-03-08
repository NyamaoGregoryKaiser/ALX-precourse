```python
import json
import logging
from fastapi import WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from app.core.dependencies import get_db
from app.services.websocket_manager import websocket_manager
from app.core.config import get_settings
from app.core import security
from app.crud.user import crud_user
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()

async def get_user_from_websocket_token(
    websocket: WebSocket,
    token: str = Query(...), # Token passed as query parameter
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates a WebSocket connection using a JWT token from query parameters.
    """
    try:
        payload = security.decode_access_token(token)
        user_id: int = payload.get("id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        user = await crud_user.get(db, id=user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
        return user
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        raise

async def websocket_endpoint(
    websocket: WebSocket,
    room_id: int = Query(...),
    current_user: dict = Depends(get_user_from_websocket_token) # Authenticate user via dependency
):
    """
    WebSocket endpoint for real-time chat communication.
    Requires a valid JWT token in the 'token' query parameter and a 'room_id'.
    """
    user_id = current_user.id
    username = current_user.username

    # Ensure the user is a member of the room before allowing connection
    # This check needs a database session, which is handled by the dependency injection.
    # However, we need to access `db` within this async function's scope,
    # so we'll re-fetch the db session for the check.
    async for db in get_db(): # Get a new session for this context
        from app.crud.chat_room import crud_chat_room # Avoid circular import at top level
        is_member = await crud_chat_room.is_member(db, room_id, user_id)
        if not is_member:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Not authorized to join this room")
            logger.warning(f"User {user_id} tried to connect to room {room_id} but is not a member.")
            return
        break # Exit the async for loop after first iteration

    try:
        await websocket_manager.connect(websocket, room_id, user_id)
        logger.info(f"WebSocket connected: User {username} (ID: {user_id}) to Room {room_id}")

        # Send a system message to the room that user has joined
        system_join_message = {
            "type": "system",
            "content": f"{username} has joined.",
            "room_id": room_id,
            "sender": {"id": user_id, "username": username}, # Simplified user info
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        await websocket_manager.broadcast_to_room(room_id, json.dumps(system_join_message))

        while True:
            # WebSockets are primarily for broadcasting messages already saved via REST API
            # For this design, direct message sending via WS is not the primary path,
            # but we keep this loop open to detect disconnects gracefully.
            # Messages come from REST API -> chat_service -> websocket_manager.broadcast_to_room
            # This endpoint will simply maintain the connection.
            # If clients also send messages directly through WS, this loop would process them.
            # For simplicity, we assume client only receives, or sends via REST.
            await websocket.receive_text() # Keep connection alive, or handle direct client messages here

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: User {username} (ID: {user_id}) from Room {room_id}")
        websocket_manager.disconnect(websocket, room_id, user_id)
        # Send a system message to the room that user has left
        system_leave_message = {
            "type": "system",
            "content": f"{username} has left.",
            "room_id": room_id,
            "sender": {"id": user_id, "username": username}, # Simplified user info
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        await websocket_manager.broadcast_to_room(room_id, json.dumps(system_leave_message))
    except Exception as e:
        logger.error(f"WebSocket error for user {username} in room {room_id}: {e}", exc_info=True)
        websocket_manager.disconnect(websocket, room_id, user_id) # Ensure cleanup on unexpected errors
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Internal server error")

```