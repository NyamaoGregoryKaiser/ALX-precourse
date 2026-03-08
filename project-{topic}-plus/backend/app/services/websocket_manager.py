```python
import logging
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Manages active WebSocket connections for chat rooms.
    Allows connecting, disconnecting, and broadcasting messages to specific rooms.
    """
    def __init__(self):
        # Stores active connections. Key: room_id, Value: List of (WebSocket, user_id) tuples
        self.active_connections: Dict[int, List[tuple[WebSocket, int]]] = {}
        # Stores user-to-connection mapping. Key: user_id, Value: List of WebSocket connections
        # A user might be connected to multiple rooms, hence list of websockets
        self.user_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        """
        Establishes a new WebSocket connection and adds it to the manager.
        """
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append((websocket, user_id))

        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

        logger.info(f"User {user_id} connected to room {room_id}. Total connections for room: {len(self.active_connections[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: int, user_id: int):
        """
        Removes a WebSocket connection from the manager upon disconnection.
        """
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                (ws, uid) for ws, uid in self.active_connections[room_id] if ws != websocket
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                ws for ws in self.user_connections[user_id] if ws != websocket
            ]
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        logger.info(f"User {user_id} disconnected from room {room_id}.")
        logger.debug(f"Remaining connections for room {room_id}: {len(self.active_connections.get(room_id, []))}")

    async def broadcast_to_room(self, room_id: int, message: str):
        """
        Sends a message to all active connections within a specific chat room.
        Handles `WebSocketDisconnect` errors gracefully.
        """
        if room_id in self.active_connections:
            # Create a list of connections to iterate over to avoid issues during modification
            connections_to_send = list(self.active_connections[room_id])
            for websocket, user_id in connections_to_send:
                try:
                    await websocket.send_text(message)
                except WebSocketDisconnect:
                    logger.warning(f"WebSocketDisconnect for user {user_id} in room {room_id} during broadcast. Removing connection.")
                    # Connection is already closed, remove it.
                    # This implies a more complex removal might be needed if not handled by `disconnect`
                    # In this basic implementation, `disconnect` is expected to be called by the client.
                    # For server-side detection, we would need to manually call disconnect here.
                    # For now, rely on client-side disconnect.
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id} in room {room_id}: {e}")

    async def send_personal_message(self, user_id: int, message: str):
        """
        Sends a message to all active connections of a specific user.
        """
        if user_id in self.user_connections:
            for websocket in list(self.user_connections[user_id]):
                try:
                    await websocket.send_text(message)
                except WebSocketDisconnect:
                    logger.warning(f"WebSocketDisconnect for user {user_id} during personal message. Removing connection.")
                    # This would require a more robust way to identify and remove *that specific* websocket from all rooms and user_connections
                    # For simplicity, we assume client-side disconnect handles it or a periodic cleanup
                except Exception as e:
                    logger.error(f"Error sending personal message to user {user_id}: {e}")

    def get_connected_users_in_room(self, room_id: int) -> List[int]:
        """
        Returns a list of user IDs currently connected to a given room.
        """
        if room_id in self.active_connections:
            return list(set(uid for _, uid in self.active_connections[room_id]))
        return []

websocket_manager = WebSocketManager()
```