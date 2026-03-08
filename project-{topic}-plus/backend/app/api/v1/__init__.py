```python
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, chat_rooms, messages
from app.api.v1 import websockets

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(chat_rooms.router, prefix="/rooms", tags=["Chat Rooms"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.add_api_websocket_route("/ws", websockets.websocket_endpoint) # WebSocket route
```