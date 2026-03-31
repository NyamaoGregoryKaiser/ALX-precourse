```python
from typing import Dict, List
from fastapi import WebSocket
from backend.app.core.logger import app_logger
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {} # user_id -> List[WebSocket]
        self.chat_room_connections: Dict[int, List[WebSocket]] = {} # chat_id -> List[WebSocket]

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        app_logger.info(f"User {user_id} connected via WebSocket. Total connections for user: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        app_logger.info(f"User {user_id} disconnected from WebSocket.")

        # Also remove from any chat rooms it might be in
        for chat_id, connections in list(self.chat_room_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.chat_room_connections[chat_id]
                app_logger.info(f"WebSocket disconnected from chat room {chat_id}.")

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    app_logger.error(f"Error sending personal message to user {user_id}: {e}")

    async def broadcast_to_chat(self, chat_id: int, message: str):
        if chat_id in self.chat_room_connections:
            for connection in self.chat_room_connections[chat_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    app_logger.error(f"Error broadcasting to chat {chat_id}: {e}")

    async def join_chat_room(self, websocket: WebSocket, chat_id: int):
        if chat_id not in self.chat_room_connections:
            self.chat_room_connections[chat_id] = []
        if websocket not in self.chat_room_connections[chat_id]:
            self.chat_room_connections[chat_id].append(websocket)
            app_logger.info(f"WebSocket joined chat room {chat_id}. Total connections for chat: {len(self.chat_room_connections[chat_id])}")
            await websocket.send_text(json.dumps({"type": "chat_joined", "chat_id": chat_id}))

    async def leave_chat_room(self, websocket: WebSocket, chat_id: int):
        if chat_id in self.chat_room_connections and websocket in self.chat_room_connections[chat_id]:
            self.chat_room_connections[chat_id].remove(websocket)
            if not self.chat_room_connections[chat_id]:
                del self.chat_room_connections[chat_id]
            app_logger.info(f"WebSocket left chat room {chat_id}.")
            await websocket.send_text(json.dumps({"type": "chat_left", "chat_id": chat_id}))

manager = ConnectionManager()
```